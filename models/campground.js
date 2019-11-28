var mongoose = require("mongoose");

var campgroundSchema = new mongoose.Schema({
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String
	},
	name: String,
	price: String,
	image: String,
	imageId: String,
	description: String,
	createdAt: {type: Date, default: Date.now},
	comments: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment"
		}
	],
	likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
	reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review"
        }
    ],
    rating: {
        type: Number,
        default: 0
    },
	//google maps shit
	location: String,
	lat: Number,
	lng: Number

});

module.exports = mongoose.model("Campground", campgroundSchema);