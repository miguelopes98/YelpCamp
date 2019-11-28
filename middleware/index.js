var Campground = require("../models/campground.js"),
	Comment = require("../models/comment.js"),
	Review = require("../models/reviews.js");
	
//EXPRESS BRUTE SET UP
const ExpressBrute = require("express-brute");
const MongooseStore = require("express-brute-mongoose");
const BruteForceSchema = require("express-brute-mongoose/dist/schema");
const mongoose = require("mongoose");
var moment = require('moment');

var model = mongoose.model("bruteforce", new mongoose.Schema(BruteForceSchema));
var store = new MongooseStore(model);
//var bruteforce = new ExpressBrute(store);

//all the middleware goes here

var middlewareObj = {};

//WRITING THE BRUCE FORCE PREVENTION MIDDLEWARE...
var failCallback = function (req, res, next, nextValidRequestDate) {
    req.flash('error', "You've made too many failed attempts in a short period of time, please try again " + moment(nextValidRequestDate).fromNow());
    res.redirect('/login'); // brute force protection triggered, send them back to the login page
};

var handleStoreError = function (error) {
    log.error(error); // log this error so we can figure out what went wrong
    // cause node to exit, hopefully restarting the process fixes the problem
    throw {
        message: error.message,
        parent: error.parent
    };
}

// Start slowing requests after 5 failed attempts to do something for the same user
middlewareObj.userBruteforce = new ExpressBrute(store, {
    freeRetries: 3,
    minWait: 5*60*1000, // 5 minutes
    maxWait: 60*60*1000, // 1 hour,
	lifetime: 24*60*60, //1 day
    failCallback: failCallback,
    handleStoreError: handleStoreError,
	attachResetToRequest: true
});
middlewareObj.bruteforce = new ExpressBrute(store);

//WRITING THE siLoggedIn MIDDLEWARE...
middlewareObj.isLoggedIn = function(req, res, next){
	if(req.isAuthenticated()){
	   return next();
	}
	req.flash("error", "You need to be logged in to do that.");
	res.redirect("/login");
}


//WRITING THE IS USER THE OWNER OF A POST MIDDLEWARE...
middlewareObj.checkCampgroundOwnership = function(req, res, next){
	//is user logged in?
	if(req.isAuthenticated())
	{
		//does user own the campground?
		Campground.findById(req.params.id, function(err, foundCampground){
			if(err || !foundCampground){
				req.flash("error", "Campground not found.");
				return res.redirect("back");
			}
			if(foundCampground.author.id.equals(req.user._id)){
				return next();
			}
			//if the user is not the same as the author of the campground, redirect
			req.flash("error", "You are not the author of this campground.");
			res.redirect("back");
		});
	}
	//if not, redirect
	else
	{
		req.flash("error", "You need to be logged in to do that.");
		res.redirect("back");
	}
};


//WRITING THE IS USER THE OWNER OF A COMMENT MIDDLEWARE...
middlewareObj.checkCommentOwnership = function(req, res, next){
	//is user logged in?
	if(req.isAuthenticated())
	{
		//does user own the comment?
		Comment.findById(req.params.comment_id, function(err, foundComment){
			if(err || !foundComment){
				req.flash("error", "Comment not found.");
				return res.redirect("back");
			}
			if(foundComment.author.id.equals(req.user._id)){
				return next();
			}
			//otherwise, redirect
			req.flash("error", "You are not the author of that comment.");
			res.redirect("back");
		});
	}
	//if not, redirect
	else
	{
		req.flash("error", "You are not the author of that comment.");
		res.redirect("back");
	}
}


//WRITING THE MIDDLEWARE THAT CHECKS IF THE USER OWNS A REVIEW TO DETERMINE WETHER HE'S AUTHORIZED TO UPDATE/DELETE IT.
middlewareObj.checkReviewOwnership = function(req, res, next) {
    if(req.isAuthenticated()){
        Review.findById(req.params.review_id, function(err, foundReview){
            if(err || !foundReview){
                res.redirect("back");
            }  else {
                // does user own the comment?
                if(foundReview.author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
};


//CHECKS IF THE USER ALREADY REVIEWED A CAMPGROUND TO NOT ALLOW HIM TO WRITE A SECOND REVIEW, WE ONLY ALLOW ONE REVIEW PER USER.
middlewareObj.checkReviewExistence = function (req, res, next) {
    if (req.isAuthenticated()) {
        Campground.findById(req.params.id).populate("reviews").exec(function (err, foundCampground) {
            if (err || !foundCampground) {
                req.flash("error", "Campground not found.");
                res.redirect("back");
            } else {
                // check if req.user._id exists in foundCampground.reviews
                var foundUserReview = foundCampground.reviews.some(function (review) {
                    return review.author.id.equals(req.user._id);
                });
                if (foundUserReview) {
                    req.flash("error", "You already wrote a review.");
                    return res.redirect("/campgrounds/" + foundCampground._id);
                }
                // if the review was not found, go to the next middleware
                next();
            }
        });
    } else {
        req.flash("error", "You need to login first.");
        res.redirect("back");
    }
};

module.exports = middlewareObj;