'use strict';

var config = require("../config");
var redis = require("redis").createClient;
var adapter = require("socket.io-redis");

// var Room = require("../models/room");
var User = require("../models/user");

module.exports = function(app){
  var server = require("http").createServer(app);
  var io = require("socket.io").listen(server);

  io.set("transports", ["websocket"]);

  let port = config.redis.port;
  let host = config.redis.host;
  let password = config.redis.password;
  let pubClient = redis(port, host, {auth_pass: password});
  let subClient = redis(port, host, {auth_pass: password, return_buffers: true});
  io.adapter(adapter({pubClient, subClient}));

  io.use((socket, next) => {
    require("../session")(socket.request, {}, next);
  });

  var sendLocalUserInfo = function(socket, userId){
    User.findById(userId, function(err, user){
      if(err) throw err;

      var friends = [];
      var pendingFriendRequests = [];

      var promises1 = user.friends.map(function(obj){
        return new Promise(function(resolve, reject){
          User.findById(obj._id, function(err2, friend){
            if(err2) throw err2;

            var statusId = 0;
            Object.keys(io.sockets.sockets).forEach(function(clientSocketId){
              var clientSocket = io.sockets.sockets[clientSocketId];
              if(clientSocket.request.session.passport){
                var clientUserId = clientSocket.request.session.passport.user;

                if(friend._id == clientUserId){
                  statusId = (friend.statusId < 4 ? friend.statusId : 0);
                }
              }
            });
            friends.push({username: friend.username, statusId: statusId});

            resolve();
          });
        });
      });

      var promises2 = user.pendingFriendRequests.map(function(obj){
        return new Promise(function(resolve, reject){
          User.findById(obj._id, function(err2, friend){
            if(err2) throw err2;

            pendingFriendRequests.push({username: friend.username});

            resolve();
          });
        });
      });

      Promise.all(promises1).then(function(){
        Promise.all(promises2).then(function(){
          socket.emit("me:user:init", {username: user.username, statusId: user.statusId, friends: friends, pendingFriendRequests: pendingFriendRequests});
        });
      });
    });
  };

  var sendGlobalUserInfo = function(userId){
    Object.keys(io.sockets.sockets).forEach(function(clientSocketId){
      var clientSocket = io.sockets.sockets[clientSocketId];
      if(clientSocket.request.session.passport){
        var clientUserId = clientSocket.request.session.passport.user;
        if(clientUserId == userId){
          sendLocalUserInfo(clientSocket, clientUserId);
        }
      }
    });
  };

  io.on("connection", function(socket){
    if(socket.request.session.passport){
      var userId = socket.request.session.passport.user;

      // Send User Initial Info
      sendLocalUserInfo(socket, userId);

      // Broadcast User Status
      User.findById(userId, function(err, user){
        if(err) throw err;

        Object.keys(io.sockets.sockets).forEach(function(clientSocketId){
          var clientSocket = io.sockets.sockets[clientSocketId];
          //var clientUserId = clientSocket.request.session.passport.user;

          clientSocket.emit("all:status:update", {username: user.username, statusId: (user.statusId < 4 ? user.statusId : 0)});
        });
      });

      // User Sets their Status
      socket.on("me:status:set", function(res){
        User.setStatusId({_id: userId}, res.statusId, function(err, callback){
          if(err) throw err;

          User.findById(userId, function(err2, user){
            if(err2) throw err2;
            socket.emit("me:status:update", {statusId: user.statusId});

            Object.keys(io.sockets.sockets).forEach(function(clientSocketId){
              var clientSocket = io.sockets.sockets[clientSocketId];
              var clientUserId = clientSocket.request.session.passport.user;

              clientSocket.emit("all:status:update", {username: user.username, statusId: (user.statusId < 4 ? user.statusId : 0)});
            });
          });
        });
      });

      // User Searches for Users
      socket.on("me:user:search", function(res){
        User.findById(userId, function(err, user){
          if(err) throw err;

          var users = [];
          User.findAll({username: {$regex: res.username, $options: "i"}}, function(err2, searchUsers){
            searchUsers.forEach(function(searchUser){
              if(searchUser.username != user.username){
                users.push({username: searchUser.username});
              }
            });

            socket.emit("me:user:searchResults", {users: users});
          });
        });
      });

      // User Removes friend
      socket.on("me:friend:remove", function(res){
        User.findById(userId, function(err, user){
          if(err) throw err;
          User.findOne({username: res.username}, function(err2, friend){
            if(err2) throw err2;
            for(var i=0; i<user.friends.length; i++){
              if((user.friends[i]._id).toString() == (friend._id).toString()){
                User.update({_id: userId}, {$pull: {friends: {_id: friend._id}}}, function(err3, callback){
                  if(err3) throw err3;
                  // Send User Updated Friends list
                  sendLocalUserInfo(socket, user._id);
                });
                User.update({_id: friend._id}, {$pull: {friends: {_id: user._id}}}, function(err3, callback){
                  if(err3) throw err3;
                  // Send Friend Updated Friends List IF they're online
                  sendGlobalUserInfo(friend._id);
                });
                break;
              }
            }
          });
        });
      });

      // User Sends Friend Request to User
      socket.on("me:friend:request:send", function(res){
        User.findById(userId, function(err, user){
          if(err) throw err;
          User.findOne({username: res.username}, function(err2, friend){
            if(err2) throw err2;

            var sendRequest = true;
            friend.pendingFriendRequests.forEach(function(request){
              if(request._id.toString() == user._id.toString()){
                sendRequest = false;
              }
            });

            if(sendRequest){
              User.update({username: friend.username}, {$push: {pendingFriendRequests: {_id: user._id}}}, function(err3, callback){
                if(err3) throw err3;

                // Send Friend Updated Pending Friend Requests if they're online
                sendGlobalUserInfo(friend._id);
              });
            }
          });
        });
      });

      // User Confirms/Denies Friend Request
      socket.on("me:friend:request:response", function(res){
        User.findById(userId, function(err, user){
          if(err) throw err;
          User.findOne({username: res.username}, function(err2, friend){
            if(err2) throw err2;
            user.pendingFriendRequests.forEach(function(request){
              if(request._id.toString() == friend._id.toString()){
                // Remove request
                User.update({username: user.username}, {$pull: {pendingFriendRequests: {_id: friend._id}}}, function(err3, callback){
                  if(err3) throw err3;

                  // Send User Updated Pending Friend Requests
                  sendLocalUserInfo(socket, userId);
                });

                if(res.confirm){
                  // Add Friend to User
                  User.update({username: user.username}, {$push: {friends: {_id: friend._id}}}, function(err3, callback){
                    if(err3) throw err3;

                    // Send User Updated Friend List
                    sendLocalUserInfo(socket, userId);
                  });

                  // Add User to Friend
                  User.update({username: friend.username}, {$push: {friends: {_id: user._id}}}, function(err3, callback){
                    if(err3) throw err3;

                    // Send Friend Updated Friend List if Friend is online
                    sendGlobalUserInfo(friend._id);
                  });
                }
              }
            });
          });
        });
      });

      // User Disconnects
      socket.on("disconnect", function(){
        User.findById(userId, function(err, user){
          if(err) throw err;

          Object.keys(io.sockets.sockets).forEach(function(clientSocketId){
            var clientSocket = io.sockets.sockets[clientSocketId];
            // var clientUserId = clientSocket.request.session.passport.user;

            clientSocket.emit("all:status:update", {username: user.username, statusId: 0});
          });
        });
      });
    }
  });

  return server;
};
