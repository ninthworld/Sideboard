'use strict';

var express = require("express");
var router = express.Router();
var passport = require("passport");
var Mongoose = require("mongoose");

var User = require("./models/user");
var Game = require("./models/game");

/*
 * GET
 */
router.get("/", function(req, res, next){
  if(req.isAuthenticated()){

    res.render("index", {errors: req.flash("error")});
  }else{
    res.redirect("/login");
  }
});

router.get("/lobby", function(req, res, next){
  if(req.isAuthenticated()){
    res.render("lobby", {errors: req.flash("error"), promptPass: req.flash("promptPass")});
  }else{
    req.flash("error", "You are not logged in.");
    res.redirect("/login");
  }
});

router.get("/game", function(req, res, next){

  var findInArray = function(array, item){
    return new Promise((resolve, reject) => {
      Promise.all(array.map(function(i){
        if(i._id.toString() == item.toString()) resolve();
      })).then(function(){
        reject();
      });
    });
  };

  var addUserToGame = function(gameId, userId){
    return new Promise((resolve, reject) => Game.findOneAndUpdate({_id: gameId}, {$push: {users: {_id: userId}}}).exec()
      .then(function(){
        return User.findOneAndUpdate({_id: userId}, {$push: {games: {_id: gameId}}}).exec()
          .then(function(){
            res.render("game", {gameId: _gameId});
            resolve();
          });
      }).catch(function(err){
        req.flash("error", "Could not add you to the game.");
        res.redirect("/");
        reject();
      })
    );
  };

  var isValidPassword = function(game, password){
    return game.validatePassword(password);
  };

  // Check if user is logged in
  if(req.isAuthenticated()){
    var _userId = req.session.passport.user;
    // Check if gameid is valid
    if(req.query.gid != null && Mongoose.Types.ObjectId.isValid(req.query.gid)){
      var _gameId = req.query.gid;
      // Check if game exists
      Game.findById(_gameId).exec()
        .then(function(game){
          // Check if user is on the game's userlist
          findInArray(game.users, _userId)
            .then(function(){
              // User is on the list
              res.render("game", {gameId: _gameId});
            })
            .catch(function(){
              // User is not on the list
              // Check if game requires a password
              if(game.isLocked){
                // Password required
                // Check if the given password is valid
                isValidPassword(game, req.query.password)
                  .then(function(){
                    // Password matches
                    // Add user to game
                    addUserToGame(_gameId, _userId);
                  })
                  .catch(function(err){
                    // Password doesn't match
                    req.flash("error", "Invalid password");
                    req.flash("promptPass", _gameId);
                    res.redirect("/lobby");
                  });
              }else{
                // No password Required
                // Add user to the game
                addUserToGame(_gameId, _userId);
              }
            });
        })
        .catch(function(err){
          // Game doesn't exist
          req.flash("error", "Game does not exist.");
          res.redirect("/");
        });
    }else{
      // GameId is missing or invalid
      req.flash("error", "Game does not exist.");
      res.redirect("/");
    }
  }else{
    // User is not logged in
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

  if(credentials.username == null || credentials.password == null || credentials.password2 == null || credentials.email == null || credentials.username === "" || credentials.password === "" || credentials.password2 === "" || credentials.email === ""){
    req.flash("error", "Missing credentials");
    res.redirect("/register");
  }else if(credentials.password != credentials.password2){
    req.flash("error", "Passwords don't match");
    res.redirect("/register");
  }else if(!(/^[0-9a-zA-Z]+$/.test(credentials.username)) || !(/^[0-9a-zA-Z]+$/.test(credentials.password))){
    req.flash("error", "Invalid Username or Password");
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
  }
});

router.post("/creategame", function(req, res, next){
  var settings = {
    title: req.body.title,
    isLocked: req.body.isLocked,
    password: req.body.password,
    typeId: req.body.typeId,
    typeCount: req.body.typeCount,
    formatId: req.body.formatId
  };

  if(settings.title == null || settings.isLocked == null || settings.typeId == null || settings.typeCount == null || settings.formatId == null
     || settings.title === "" || settings.isLocked === "" || (settings.isLocked == "true" && (settings.password == null || settings.password === "")) || settings.typeId === "" || settings.typeCount === "" || settings.formatId === ""){
    req.flash("error", "Cannot Create New Game: Missing parameter(s). debug(title="+settings.title+",isLocked="+settings.isLocked+",password="+settings.password+",typeId="+settings.typeId+",typeCount="+settings.typeCount+",formatId="+settings.formatId+")");
    res.redirect("/lobby");
  }else{
    var init = {
      title: settings.title,
      isLocked: (settings.isLocked == "true" ? true : false),
      password: settings.password,
      leaderId: Mongoose.Types.ObjectId(req.session.passport.user),
      users: [{
        _id: Mongoose.Types.ObjectId(req.session.passport.user)
      }],
      config: {
        typeId: settings.typeId,
        typeCount: settings.typeCount,
        formatId: settings.formatId
      }
    };

    Game.create_CB(init, function(err, newGame){
      if(!err){
        User.findOneAndUpdate({_id: Mongoose.Types.ObjectId(req.session.passport.user)}, {$push: {games: {_id: newGame._id}}}).exec()
          .then(function(){
            res.redirect("/game?gid=" + newGame._id);
          }).catch(err => {throw err});
      }else{
        res.flash("error", "Could not create new game.")
        res.redirect("/lobby");
      }
    });
  }
});

// router.post("/hashpass", function(req, res){
//   if(req.body.password){
//     Game.hashPass(req.body.password)
//       .then(function(hash){
//         res.json({hash: hash});
//       }).catch(function(err){
//         console.log(err);
//       });
//   }else{
//     res.json({hash: null});
//   }
// });

module.exports = router;
