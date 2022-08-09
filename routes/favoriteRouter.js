const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
var authenticate = require('../authenticate');
const cors = require('./cors');
var ObjectId = require('mongoose').Types.ObjectId; 

const Favorites = require('../models/favorite');
const Dishes = require('../models/dishes');

const favoriteRouter = express.Router();

favoriteRouter.use(bodyParser.json());

favoriteRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, authenticate.verifyUser, (req,res,next) => {
    Favorites.find({user: req.user._id})
    .populate('user')
    .populate('dishes')
    .then((favorites) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(favorites);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    // Check list of dishes
    if (req.body == null || req.body.length === 0) {
        err = new Error('Invalid data for the dishes');
        err.status = 404;
        return next(err);
    }
    Dishes.find({})
    .then((dishes) => {
        if (dishes == null) {
            err = new Error('No dishes exist in the database.');
            err.status = 404;
            return next(err);
        }
        const validDishes = [];
        const dishIds = req.body.map(o => o._id);
        dishes.forEach(dish => {
            if (dishIds.includes(dish._id.toString()))
            {
                validDishes.push(dish);
            }
        });
        if (dishIds.length !== validDishes.length) {
            err = new Error('A dish included in the body was not found.');
            err.status = 404;
            return next(err);
        }
        Favorites.findOne({user: req.user._id})
        .then((favorite) => {
            if (favorite == null) {
                newFav = { user: req.user._id };
                newFav.dishes = req.body;
                Favorites.create(newFav)
                .then((favorite) => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favorite);
                }, (err) => next(err));
            } else {
                Favorites.findByIdAndUpdate(
                    { _id: favorite._id },
                    { $addToSet: { dishes: {$each: req.body.map(o => new ObjectId(o._id)) } } },
                    { returnDocument: 'after' })
                .then((favorite) => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favorite);
                }, (err) => next(err));
            }
        }, (err) => next(err));
    }, (err) => next(err))
    .catch((err) => next(err));
})
.put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /favorites/');
})
.delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favorites.findOneAndRemove({user: req.user._id})
    .then((favorite) => {
        if (favorite != null) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json('Favorites for user ' + req.user._id + ' were deleted');
        } else {
            err = new Error('User ' + req.user._id + ' has no favorites to delete');
            err.status = 404;
            return next(err);
        }
    }, (err) => next(err))
    .catch((err) => next(err));    
});

favoriteRouter.route('/:dishId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, authenticate.verifyUser, (req,res,next) => {
    res.statusCode = 403;
    res.end('GET operation not supported on /favorites/'+ req.params.dishId);
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Dishes.findById(req.params.dishId)
    .then((dish) => {
        if (dish != null) {
            Favorites.findOne({user: req.user._id})
            .then((favorite) => {
                if (favorite == null) {
                    newFav = { user: req.user._id };
                    newFav.dishes = [dish._id];
                    Favorites.create(newFav)
                    .then((favorite) => {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(favorite);
                    }, (err) => next(err));
                } else {
                    Favorites.findByIdAndUpdate(
                        { _id: favorite._id },
                        { $addToSet: { dishes: new ObjectId(dish._id) } },
                        { returnDocument: 'after' })
                    .then((favorite) => {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(favorite);
                    }, (err) => next(err));
                }
            }, (err) => next(err));
        } else {
            err = new Error('Dish ' + req.params.dishId + ' not found');
            err.status = 404;
            return next(err);
        }
    }, (err) => next(err))
    .catch((err) => next(err));
})
.put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /favorites/'+ req.params.dishId);
})
.delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Dishes.findById(req.params.dishId)
    .then((dish) => {
        if (dish != null) {
            Favorites.findOne({user: req.user._id})
            .then((favorite) => {
                if (favorite != null) {
                    Favorites.findByIdAndUpdate(
                        { _id: favorite._id },
                        { $pull: { dishes: new ObjectId(dish._id) } },
                        { returnDocument: 'after' })
                    .then((favorite) => {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(favorite);
                    }, (err) => next(err));
                } else {
                    err = new Error('User ' + req.user._id + ' has no favorites');
                    err.status = 404;
                    return next(err);
                }
            }, (err) => next(err));
        } else {
            err = new Error('Dish ' + req.params.dishId + ' not found');
            err.status = 404;
            return next(err);
        }
    }, (err) => next(err))
    .catch((err) => next(err));
});

module.exports = favoriteRouter;