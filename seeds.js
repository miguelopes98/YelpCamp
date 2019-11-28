var mongoose = require("mongoose");
var Campground = require("./models/campground.js");
var Comment = require("./models/comment.js");

var data = [
	{name: "Cloud's Rest",
	 image:"https://cdn.pixabay.com/photo/2016/07/01/07/51/tent-1490599__340.jpg",
	 description: "O Lorem Ipsum é um texto modelo da indústria tipográfica e de impressão. O Lorem Ipsum tem vindo a ser o texto padrão usado por estas indústrias desde o ano de 1500, quando uma misturou os caracteres de um texto para criar um espécime de livro."
	},
	{name: "Mike's favourite",
	 image:"https://cdn.pixabay.com/photo/2016/11/21/15/14/camping-1845906__340.jpg",
	 description: "O Lorem Ipsum é um texto modelo da indústria tipográfica e de impressão. O Lorem Ipsum tem vindo a ser o texto padrão usado por estas indústrias desde o ano de 1500, quando uma misturou os caracteres de um texto para criar um espécime de livro."
	},
	{name: "Love it",
	 image:"https://cdn.pixabay.com/photo/2015/03/26/10/29/camping-691424__340.jpg",
	 description: "O Lorem Ipsum é um texto modelo da indústria tipográfica e de impressão. O Lorem Ipsum tem vindo a ser o texto padrão usado por estas indústrias desde o ano de 1500, quando uma misturou os caracteres de um texto para criar um espécime de livro."
	}
]

function seedDB(){
	//remove all campgrounds
	Campground.remove({}, function(err){
		if(err){
			console.log(err);
		}
		else{
			console.log("removed campgrounds!");
		}
		//o que vem a seguir esta dentro da callback para so correr depois dos campgrounds serem removed
		//remove all comments
		Comment.remove({}, function(err){
			if(err){
				console.log(err);
			}
			else{
				console.log("removed all comments!");
			}
			//add a few campgrounds
			for(var i = 0; i < data.length; i++){
				Campground.create(data[i], function(err, campground){
					if(err){
						console.log(err);
					}
					else{
						console.log("added a campground");
						//create a comment
						Comment.create(
							{
								text: "This place is great, but i wish there was internet",
								author: "Homer"
							}, function(err, comment){
								if(err){
									console.log(err);
								}
								else{
									campground.comments.push(comment);
									campground.save();
									console.log("Created new comment");
								}
							});
					}
				});
			}
		});
	});	
}

module.exports = seedDB;