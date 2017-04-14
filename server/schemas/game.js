'use strict';

var Mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");

const SALT_WORK_FACTOR = 10;

var GameSchema = new Mongoose.Schema({
  title: { type: String, default: null },
  isLocked: { type: Boolean, default: false },
  password: { type: String, default: null },
  leaderId: { type: Mongoose.Schema.ObjectId, default: null },
  users: [{
    _id: { type: Mongoose.Schema.ObjectId, default: null },
    isMuted: { type: Boolean, default: false }
  }],
  config: {
    typeId: { type: Number, default: 0 },     // (0) Teams, (1) FFA
    typeCount: { type: Number, default: 2 },  // Max Player count (Ex: "3" (FFA 3 or Teams 3v3))
    formatId: { type: Number, default: 0 }    // (0) Standard, (1) Modern, (2) Commander, (3) Legacy
  },
  game: {
    isRunning: { type: Boolean, default: false },
    gameTurn: { type: Number, default: 1 },
    playerIdTurn: { type: Mongoose.Schema.ObjectId, default: null },
    players: [{
      _id: { type: Mongoose.Schema.ObjectId, default: null },
      teamId: { type: Number, default: 1 },
      isReady: { type: Boolean, default: false },
      deckId: { type: Mongoose.Schema.ObjectId, default: null }
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

GameSchema.methods.validatePassword = function(password){
  return new Promise((resolve, reject) => {
    if(password == null) return reject(null);
    bcrypt.compare(password, this.password, (err, isMatch) => {
      if(err) return reject(err);
      if(isMatch) return resolve();
      return reject();
    });
  });

};

// GameSchema.statics.hashPass = function(data){
//   return new Promise((resolve, reject) =>
//     bcrypt.genSalt(SALT_WORK_FACTOR, (err, salt) => {
//       if(err) return reject(err);
//       bcrypt.hash(data, salt, null, (err, hash) => {
//         if(err) return reject(err);
//         return resolve(hash);
//       });
//     })
//   );
// };

module.exports = Mongoose.model("game", GameSchema);
