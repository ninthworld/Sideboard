'use strict';

var express = require("express");
var router = express.Router();
var passport = require("passport");

var User = require("../models/user");

/*
 * GET
 */
router.get("/", function(req, res, next){
  if(req.isAuthenticated()){
    res.render("index", {username: req.user.username, status: req.user.status});
  }else{
    req.flash("error", "You are not logged in.");
    res.redirect("/login");
  }
});

router.get("/login", function(req, res, next){
  if(req.isAuthenticated()){
    res.redirect("/");
  }else{
    res.render("login", {
      success: req.flash("success")[0],
      errors: req.flash("error")
    });
  }
});

router.get("/register", function(req, res, next){
  if(req.isAuthenticated()){
    res.redirect("/");
  }else{
    res.render("register", {
      success: req.flash("success")[0],
      errors: req.flash("error")
    });
  }
});

router.get("/logout", function(req, res, next){
  req.logout();
  req.session = null;
  res.redirect("/login");
});

router.get("/rooms", [User.isAuthenticated, function(req, res, next){
  res.render("rooms", { });
}]);

/*
 * POST
 */
router.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login",
  failureFlash: true
}));

router.post("/register", function(req, res, next){
  var credentials = {
    username: req.body.username,
    password: req.body.password
  };

  if(credentials.username === "" || credentials.password === ""){
    req.flash("error", "Missing credentials");
    res.redirect("/register");
  }else{
    User.findOne({"username": new RegExp("^" + credentials.username + "$", "i")}, function(err, user){
      if(err) throw err;
      if(user){
        req.flash("error", "Username already exists.");
        res.redirect("/register");
      }else{
        User.create(credentials, function(err, newUser){
          if(err) throw err;

          req.flash("success", "Account successfully created. Please log in.");
          res.redirect("/login");
        });
      }
    });
  }
});

module.exports = router;
