'use strict';

var config = require("../config");
var Mongoose = require("mongoose");
var logger = require("../logger");

Mongoose.connect(config.dbURI);

Mongoose.connection.on("error", function(err){
  if(err) throw err;
});

Mongoose.Promise = global.Promise;

module.exports = {
  Mongoose,
  models: {
    user: require("./schemas/user.js"),
    game: require("./schemas/game.js")
  }
};
