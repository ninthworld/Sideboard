'use strict';

var userModel = require("../database").models.user;

var create = function(data, callback){
  var newUser = new userModel(data);
  newUser.save(callback);
};

var findOne = function(data, callback){
  userModel.findOne(data, callback);
};

var findById = function(id, callback){
  userModel.findById(id, callback);
};

var findAll = function(ids, callback){
  userModel.find(ids, callback);
};

var update = function(data, set, callback){
  userModel.findOneAndUpdate(data, set, callback);
};

var isAuthenticated = function(req, res, next){
  if(req.isAuthenticated()){
    next();
  }else{
    res.redirect("/");
  }
};

var setStatusId = function(data, statusId, callback){
  userModel.findOneAndUpdate(data, {"statusId": statusId}, callback);
};

module.exports = {
  create,
  findOne,
  findById,
  findAll,
  update,
  isAuthenticated,
  setStatusId
};
