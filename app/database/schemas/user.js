'use strict';

var Mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");

const SALT_WORK_FACTOR = 10;
const DEFAULT_USER_AVATAR = "/images/avatar.png";

var UserSchema = new Mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, default: null },
  email: { type: String, default: null },
  statusId: {type: Number, default: 1},     // (0) Offline, (1) Online, (2) Away, (3) Busy, (4) Invisible
  avatar:  { type: String, default: DEFAULT_USER_AVATAR },
  friends: [{
    _id: { type: Mongoose.Schema.ObjectId, required: true }
  }],
  pendingFriendRequests: [{
    _id: { type: Mongoose.Schema.ObjectId, required: true }
  }],
  games: [{
    _id: { type: Mongoose.Schema.ObjectId, required: true }
  }],
  decks: [{
    _id: { type: Mongoose.Schema.ObjectId, required: true }
  }]
});

UserSchema.pre("save", function(next){
  var user = this;

  if(!user.avatar) user.avatar = DEFAULT_USER_AVATAR;

  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt){
    if(err) return next(err);

    bcrypt.hash(user.password, salt, null, function(err, hash){
      if(err) return next(err);

      user.password = hash;
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

module.exports = Mongoose.model("user", UserSchema);
