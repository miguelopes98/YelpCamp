var express = require("express"),
	router = express.Router({mergeParams: true}),
	passport = require("passport"),
	Campground = require("../models/campground.js"),
	Comment = require("../models/comment.js"),
	middleware = require("../middleware/index.js");

//NEW COMMENT ROUTE - shows the form to create a new comment
router.get("/new", middleware.isLoggedIn, function(req, res){
	//find campground by id
	Campground.findById(req.params.id, function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "Campground not found.");
			res.redirect("back");
		}
		else{
			res.render("comments/new", {campground: foundCampground});
		}
	})
});

//CREATE COMMENT ROUTE - adds new comment to the database
router.post("/", middleware.isLoggedIn, function(req, res){
	//lookup campground using ID
	Campground.findById(req.params.id, function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "Campground not found.");
			res.redirect("/campgrounds");
		}
		else{
			//create new comment
			Comment.create(req.body.comment, function(err, comment){
				if(err){
					req.flash("error", "Wasn't able to create comment.");
					res.redirect("back");
				}
				else{
					//add username and id to comment
					comment.author.id = req.user._id;
					comment.author.username = req.user.username;
					comment.save();
					//save comment
					//connect comment to campground
					foundCampground.comments.push(comment);
					foundCampground.save();
					req.flash("success", "Successfully added comment.");
					//redirect to campground show page
					res.redirect("/campgrounds/" + foundCampground._id)
				}
			});
		}
	});
});

//EDIT ROUTE - shows the form to edit a comment
router.get("/:comment_id/edit", middleware.checkCommentOwnership, function(req, res){
	Comment.findById(req.params.comment_id, function(err, foundComment){
		if(err || !foundComment){
			req.flash("error", "Comment not found.");
			return res.redirect("back");
		}
		res.render("comments/edit.ejs", {campgroundId: req.params.id, comment: foundComment});
	});
});

//UPDATE ROUTE - updates the the comment
router.post("/:comment_id", middleware.checkCommentOwnership, function(req, res){
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
		if(err || !updatedComment){
			req.flash("error", "Comment not found.");
			res.redirect("back");
		}
		res.redirect("/campgrounds/" + req.params.id);
	});
});

//DELETE ROUTE - deletes a comment
router.post("/:comment_id/delete", middleware.checkCommentOwnership, function(req, res){
	Comment.findByIdAndRemove(req.params.comment_id, function(err, foundComment){
		if(err || !foundComment){
			req.flash("error", "Comment not found.");
			return res.redirect("back");
		}
		req.flash("success", "Comment deleted.");
		res.redirect("/campgrounds/" + req.params.id);
	});
});


module.exports = router;