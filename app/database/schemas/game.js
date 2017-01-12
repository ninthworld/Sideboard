'use strict';

var Mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");

const SALT_WORK_FACTOR = 10;

var GameSchema = new Mongoose.Schema({
  title: { type: String, default: null },
  isLocked: { type: Boolean, default: false },
  password: { type: String, default: null },
  leaderId: { type: Mongoose.Schema.ObjectId, required: true },
  users: [{
    _id: { type: Mongoose.Schema.ObjectId, required: true }
  }],
  config: {
    typeId: { type: Number, default: 0 },     // (0) Teams, (1) FFA
    typeCount: { type: Number, default: 2 },  // Max Player count (Ex: "3" (FFA 3 or Teams 3v3))
    formatId: { type: Number, default: 0 }    // (0) Standard, (1) Modern, (2) Commander, (3) Legacy
  },
  game: {
    isRunning: { type: Boolean, default: false },
    gameTurn: { type: Number, default: 1 },
    playerIdTurn: { type: Mongoose.Schema.ObjectId, required: true },
    players: [{
      _id: { type: Mongoose.Schema.ObjectId, required: true },
      deckId: { type: Mongoose.Schema.ObjectId, required: true }
    }]
  }
});

GameSchema.pre("save", function(next){
  var game = this;

  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt){
    if(err) return next(err);

    bcrypt.hash(game.password, salt, null, function(err, hash){
      if(err) return next(err);

      game.password = hash;
      next();
    });
  });
});

UserSchema.methods.validatePassword = function(password, callback){
  bcrypt.compare(password, this.password, function(err, isMatch){
    if(err) return callback(err);
    callback(null, isMatch);
  });
};

module.exports = Mongoose.model("game", GameSchema);
