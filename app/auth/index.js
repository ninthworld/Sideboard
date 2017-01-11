'use strict';

var config = require("../config");
var passport = require("passport");
var logger = require("../logger");

var LocalStrategy = require("passport-local").Strategy;

var User = require("../models/user");

module.exports = function(){
  passport.serializeUser(function(user, done){
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
      done(err, user);
    });
  });

  passport.use(new LocalStrategy(
    function(username, password, done){
      User.findOne({username: new RegExp(username, "i")}, function(err, user){
        if(err) return done(err);
        if(!user) return done(null, false, {message: "Incorrect username or password."});

        user.validatePassword(password, function(err, isMatch){
          if(err) return done(err);
          if(!isMatch) return done(null, false, {message: "Incorrect username or password."});

          return done(null, user);
        });
      });
    }
  ));

  return passport;
};
