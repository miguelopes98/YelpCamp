require('dotenv').config();

var express = require("express"),
	app = express(),
	bodyParser = require("body-parser"),
	mongoose = require("mongoose"),
	flash = require("connect-flash"),
	passport = require("passport"),
	LocalStrategy = require("passport-local"),
	Campground = require("./models/campground.js"),
	Comment = require("./models/comment.js"),
	User = require("./models/user.js"),
	Review = require("./models/reviews.js"),
	seedDB = require("./seeds.js");

//requiring Routes
var campgroundRoutes = require("./routes/campgrounds.js"),
	commentRoutes = require("./routes/comments.js"),
	indexRoutes = require("./routes/index.js"),
	reviewRoutes = require("./routes/reviews.js")

mongoose.connect("mongodb://localhost:27017/yelp_camp", {useNewUrlParser: true, useUnifiedTopology:true});
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine", ".ejs");
app.use(express.static("public"));
app.use(flash());
app.locals.moment = require("moment");
//seedDB(); //seed the database

//PASSPORT CONFIGURATION
app.use(require("express-session")({
	secret: "Once again rusty wins cutest dog",
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//PASSANDO INFO DO USER PARA TODOS OS ROUTES
//todos os routes correm este middleware, que diz que nos respectivos templates currentUser = req.user
app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
})

//dizendo ao express para usar os routes que estao nos respectivos ficheiros
app.use("/", indexRoutes); //routes non related with mongoose models
app.use("/campgrounds", campgroundRoutes); //routes related with the campground model
app.use("/campgrounds/:id/comments", commentRoutes); //routes related to the comment model
app.use("/campgrounds/:id/reviews", reviewRoutes); //routes related to the review model



app.listen(process.env.PORT || 3000);