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
    res.render("index");
  }else{
    res.redirect("/login");
  }
});

router.get("/lobby", function(req, res, next){
  if(req.isAuthenticated()){
    res.render("lobby");
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
    password: req.body.password,
    password2: req.body.password2,
    email: req.body.email
  };

  if(credentials.username === "" || credentials.password === "" || credentials.password2 === "" || credentials.email === ""){
    req.flash("error", "Missing credentials");
    res.redirect("/register");
  }else if(credentials.password != credentials.password2){
    req.flash("error", "Passwords don't match");
    res.redirect("/register");
  }else{
    User.find({"email": credentials.email}).exec()
      .then(function(users1){
        if(users1.length > 0){
          req.flash("error", "Email already exists.");
          res.redirect("/register");
        }else{
          return User.find({"username": new RegExp("^" + credentials.username + "$", "i")}).exec()
            .then(function(users2){
              if(users2.length > 0){
                req.flash("error", "Username already exists.");
                res.redirect("/register");
              }else{
                User.create_CB(credentials, function(err, newUser){
                  if(err) throw err;

                  req.flash("success", "Account successfully created. Please log in.");
                  res.redirect("/login");
                });
              }
            });
        }
      }).catch(err => {throw err});
    // User.findOne_CB({"username": new RegExp("^" + credentials.username + "$", "i")}, function(err, user){
    //   if(err) throw err;
    //   if(user){
    //     req.flash("error", "Username already exists.");
    //     res.redirect("/register");
    //   }else{
    //     User.create_CB(credentials, function(err, newUser){
    //       if(err) throw err;
    //
    //       req.flash("success", "Account successfully created. Please log in.");
    //       res.redirect("/login");
    //     });
    //   }
    // });
  }
});

module.exports = router;
