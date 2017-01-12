'use strict';

var userModel = require("../database").models.user;

var create_CB = function(data, callback){
  var newUser = new userModel(data);
  newUser.save(callback);
};

var findOne_CB = function(data, callback){
  userModel.findOne(data, callback);
};

var findOne = function(data){
  return userModel.findOne(data);
};

var findById_CB = function(id, callback){
  userModel.findById(id, callback);
};

var findById = function(id){
  return userModel.findById(id);
}

var findAll_CB = function(ids, callback){
  userModel.find(ids, callback);
};

var update_CB = function(data, set, callback){
  userModel.findOneAndUpdate(data, set, callback);
};

var findOneAndUpdate = function(data, set){
  return userModel.findOneAndUpdate(data, set);
};

var find = function(data){
  return userModel.find(data);
};

var isAuthenticated = function(req, res, next){
  if(req.isAuthenticated()){
    next();
  }else{
    res.redirect("/");
  }
};

var setStatusId_CB = function(data, statusId, callback){
  userModel.findOneAndUpdate(data, {"statusId": statusId}, callback);
};

var Status = {
  Offline: 0,
  Online: 1,
  Away: 2,
  Busy: 3,
  Invisible: 4
};

module.exports = {
  create_CB,
  findOne_CB,
  findOne,
  findById_CB,
  findById,
  findAll_CB,
  update_CB,
  find,
  findOneAndUpdate,
  isAuthenticated,
  setStatusId_CB,
  Status
};
