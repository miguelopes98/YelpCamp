var express = require("express"),
	router = express.Router({mergeParams:true}),
	passport = require("passport"),
	Campground = require("../models/campground.js"),
	Comment = require("../models/comment.js"),
	Review = require("../models/reviews.js"),
	middleware = require("../middleware/index.js"),
	multer = require('multer'),
	storage = multer.diskStorage({
  		filename: function(req, file, callback) {
    		callback(null, Date.now() + file.originalname);
  		}
	});

//GOOGLE MAPS SET UP
var NodeGeocoder = require('node-geocoder');
 
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
var geocoder = NodeGeocoder(options);

//IMAGE UPLOAD HANDLING
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'duxwvcf0o', 
  api_key: process.env.CLOUDINARY_API_KEY,  
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//INDEX - show all campgrounds
router.get("/", function(req, res){
	var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        // Get the campgrounds that match the search from DB
        Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, allCampgrounds){
			Campground.count({name: regex}).exec(function(err, count){
				if(err){
				   console.log(err);
				   req.flash("error", "Campground/Campgrounds not found.");
			   } else {
				  if(allCampgrounds.length < 1) {
					  noMatch = "No campgrounds match that search, please try again.";
				  }
				  res.render("campgrounds/index",{
					campgrounds:allCampgrounds,
					noMatch: noMatch,
					current: pageNumber,
					pages: Math.ceil(count / perPage),
					search: req.query.search
				  });
			   }
			}) 
        });
    } 
	else
	{
        //Get all campgrounds from DB
		//Campground.find() vai correr e tudo o que encontrar vai guardar em allCampgrounds
		Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
			Campground.count().exec(function (err, count) {
				if (err) {
					console.log(err);
					req.flash("error", "Campground/Camgprounds not found.");
					res.redirect("back");
				} else {
					res.render("campgrounds/index", {
						campgrounds: allCampgrounds,
						current: pageNumber,
						pages: Math.ceil(count / perPage),
						noMatch: noMatch,
						search: req.query.search
					});
				}
			});
		});
    }
});

//CREATE ROUTE - add new campground to database
router.post("/", middleware.isLoggedIn, upload.single("image"), function(req, res){
	if(req.file !== undefined){
		cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
			if(err){
				console.log(err);
				req.flash("error", err.message);
				return res.redirect("back");
			}
			// add cloudinary url for the image to the campground object under image property
			req.body.newCampground.image = result.secure_url;
			//add image's public_id to campground object
			req.body.newCampground.imageId = result.public_id;
			// add author to campground

			req.body.newCampground.author = {
				id: req.user._id,	
				username: req.user.username
			}
			geocoder.geocode(req.body.location, function (err, data) {
				if (err || !data.length) {
				  req.flash('error', 'Invalid address');
				  return res.redirect('back');
				}
				req.body.newCampground.lat = data[0].latitude;
				req.body.newCampground.lng = data[0].longitude;
				req.body.newCampground.location = data[0].formattedAddress;
				Campground.create(req.body.newCampground, function(err, newCampground) {
					if (err) {
						req.flash('error', err.message);
						return res.redirect('back');
					}
					res.redirect('/campgrounds/' + newCampground.id);
				});
			});
		});
	}
	else{
		 geocoder.geocode(req.body.location, function (err, data) {
			if (err || !data.length) {
			  req.flash('error', 'Invalid address');
			  return res.redirect('back');
			}
			req.body.newCampground.lat = data[0].latitude;
			req.body.newCampground.lng = data[0].longitude;
			req.body.newCampground.location = data[0].formattedAddress;
			//create a new campground and save to DB
			Campground.create(req.body.newCampground, function(err, newCampground){ //newCampground e o item que vai ser criado e guardado
				if(err){
					req.flash("error", "Wasn't able to create campground.");
					res.redirect("back");
				} 
				else{
					//adding author to newcampground
					newCampground.author.id = req.user._id;
					newCampground.author.username = req.user.username;
					newCampground.save();
					//redirect back to campgrounds page
					res.redirect("/campgrounds/" + newCampground.id);
				}
			});
		});
	}
});

//NEW ROUTE - shows the form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
	res.render("campgrounds/new");
});

// SHOW - shows more info about one campground
router.get("/:id", function (req, res) {
    //find the campground with provided ID
    Campground.findById(req.params.id).populate("comments likes").populate({
        path: "reviews",
        options: {sort: {createdAt: -1}}
    }).exec(function (err, foundCampground) {
        if(err || !foundCampground){
			req.flash("error", "Campground not found.");
			res.redirect("back");
		} else {
            //render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

//EDIT CAMPGROUND ROUTE - show form to edit the campground
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
	Campground.findById(req.params.id, function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "Campground not found.");
			return res.redirect("/campgrounds" + req.params.id);
		}
		res.render("campgrounds/edit.ejs", {campground: foundCampground});
	});	
});

//UPDATE CAMPGROUND ROUTE - updates campground in the database
router.post("/:id", middleware.checkCampgroundOwnership, upload.single("image"), function(req, res){
	//google maps handling
	geocoder.geocode(req.body.location, function (err, data) {
		if (err || !data.length) {
		  req.flash('error', 'Invalid address');
		  return res.redirect('back');
		}
		req.body.newCampground.lat = data[0].latitude;
		req.body.newCampground.lng = data[0].longitude;
		req.body.newCampground.location = data[0].formattedAddress;
		//se o user deu upload duma imagem
		if(req.file !== undefined){
			Campground.findById(req.params.id, async function(err, campground){
				if(err){
					req.flash("error", err.message);
					res.redirect("back");
				} else {
					if (req.file) {
					  try {
						  await cloudinary.v2.uploader.destroy(campground.imageId);
						  var result = await cloudinary.v2.uploader.upload(req.file.path);
						  campground.imageId = result.public_id;
						  campground.image = result.secure_url;
					  } catch(err) {
						  req.flash("error", err.message);
						  return res.redirect("back");
					  }
					}
					campground.name = req.body.newCampground.name;
					campground.price = req.body.newCampground.price;
					campground.description = req.body.newCampground.description;
					campground.save();
					req.flash("success","Successfully Updated!");
					res.redirect("/campgrounds/" + campground._id);
				}
			});
		}

		//se o user nao deu upload duma imagem
		else
		{
			//find and update the correct campground
			Campground.findByIdAndUpdate(req.params.id, req.body.newCampground, function(err, updatedCampground){
				if(err || !updatedCampground){
					req.flash("error", "Campground not found.");
					return res.redirect("/campgrounds");
				}
				updatedCampground.imageId = "";
				updatedCampground.save();
				//redirect somewhere
				res.redirect("/campgrounds/" + req.params.id);
			});
		}
	});
});

//DELETE CAMPGROUND ROUTE
router.post("/:id/delete", middleware.checkCampgroundOwnership, function(req, res){
	Campground.findByIdAndRemove(req.params.id, function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "Campground not found.");
			res.redirect("/campgrounds" + req.params.id);
		} else {
            // deletes all comments associated with the campground
            Comment.remove({"_id": {$in: foundCampground.comments}}, function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/campgrounds");
                }
                // deletes all reviews associated with the campground
                Review.remove({"_id": {$in: foundCampground.reviews}}, function (err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/campgrounds");
                    }
                    //  delete the campground
                    foundCampground.remove();
                    req.flash("success", "Campground deleted successfully!");
                    res.redirect("/campgrounds");
                });
            });
        }
	});
});

//DELETE CAMPGROUND ROUTE
router.post("/:id/delete", middleware.checkCampgroundOwnership, function(req, res){
	Campground.findById(req.params.id, async function(err, campground) {
		if(err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
		try {
			await cloudinary.v2.uploader.destroy(campground.imageId);
			//campground.remove();
			//req.flash('success', 'Campground deleted successfully!');
			//res.redirect('/campgrounds');
		} catch(err) {
			if(err) {
				req.flash("error", err.message);
				return res.redirect("back");
			}
		}
	});
	
	Campground.findByIdAndRemove(req.params.id, async function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "Campground not found.");
			res.redirect("/campgrounds" + req.params.id);
		} else {
            // deletes all comments associated with the campground
            Comment.remove({"_id": {$in: foundCampground.comments}}, function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/campgrounds");
                }
                // deletes all reviews associated with the campground
                Review.remove({"_id": {$in: foundCampground.reviews}}, function (err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/campgrounds");
                    }
                    //  delete the campground
                    foundCampground.remove();
                    req.flash("success", "Campground deleted successfully!");
                    res.redirect("/campgrounds");
                });
            });
        }
	});
});

// Campground Like Route - corre quando o user carrega no like button, checkamos a ver se ja tinha dado like, se ja, tiramos o like do campground, se nao, adicionamos o like
router.post("/:id/like", middleware.isLoggedIn, function (req, res) {
    Campground.findById(req.params.id, function (err, foundCampground) {
        if (err) {
            console.log(err);
            return res.redirect("/campgrounds");
        }

        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundCampground.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCampground.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCampground.likes.push(req.user);
        }

        foundCampground.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/campgrounds");
            }
            return res.redirect("/campgrounds/" + foundCampground._id);
        });
    });
});


//function that we're going to call on the index route to do the fuzzy search
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;