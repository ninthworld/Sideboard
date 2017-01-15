'use strict';

var gameModel = require("../database").models.game;

var create_CB = function(data, callback){
  var newGame = new gameModel(data);
  newGame.save(callback);
};

var findOne = function(data){
  return gameModel.findOne(data);
};

var findById = function(id){
  return gameModel.findById(id);
}

var findOneAndUpdate = function(data, set){
  return gameModel.findOneAndUpdate(data, set);
};

var find = function(data){
  return gameModel.find(data);
};

// var hashPass = function(data){
//   return gameModel.hashPass(data);
// };

var Type = {
  Teams: 0,
  FFA: 1
};

var Format = {
  Standard: 0,
  Modern: 1,
  Commander: 2,
  Legacy: 3
};

module.exports = {
  create_CB,
  findOne,
  findById,
  findOneAndUpdate,
  find,
  Type,
  Format
  // hashPass
};
