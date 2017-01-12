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

  // Return: UserId from a Socket
  var getUserIdFromSocket = function(socket){
    if(socket.request.session.passport) return socket.request.session.passport.user;
    return null;
  };

  // Return: Filtered StatusId (invisible becomes offline)
  var filterStatusId = function(statusId){
    return (statusId == User.Status.Invisible ? User.Status.Offline : statusId);
  };

  // Return: Promise(An array of all open sockets)
  var getOpenSockets = function(){
    var sockets = [];

    return Promise.all(Object.keys(io.sockets.sockets).map(function(socketId){
      sockets.push(io.sockets.sockets[socketId]);
    })).then(function(){
      return Promise.resolve(sockets);
    });
  };

  // Return: Promise(Socket from a UserId)
  var getSocketFromUserId = function(userId){
    return getOpenSockets().then(function(sockets){
      return Promise.all(sockets.map(function(socket){
        var uid = getUserIdFromSocket(socket);
        if(uid != null && ((uid).toString() == (userId).toString())) return Promise.reject(socket);
      })).then(function(){
        return Promise.resolve(null);
      }).catch(function(socket){
        return Promise.resolve(socket);
      });
    });
  };

  // Return: Promise(StatusId of UserId)
  var getStatusIdFromUserId = function(userId){
    return getSocketFromUserId(userId).then(function(socket){
      if(socket == null) return Promise.resolve(User.Status.Offline);
      return User.findById(userId).exec()
        .then(function(user){
          return user.statusId;
        });
    });
  };

  // Send Socket's User Info to Socket
  // Return: Promise(reject/resolve of success)
  var sendUserInfo = function(socket){
    var data = {
      username: "",
      statusId: User.Status.Offline,
      friends: [],
      pendingFriendRequests: []
    };

    var userId = getUserIdFromSocket(socket);
    if(userId == null) return Promise.reject("Cannot get UserId");
    return User.findById(userId).exec()
      .then(function(user){
        data.username = user.username;
        data.statusId = user.statusId;

        return Promise.all(user.friends.map(function(friend){
          return User.findById(friend._id).exec()
            .then(function(friendUser){
              return getStatusIdFromUserId(friend._id)
                .then(function(friendStatusId){
                  data.friends.push({
                    username: friendUser.username,
                    statusId: filterStatusId(friendStatusId)
                  });
                });
            });
          })).then(function(){
            return Promise.all(user.pendingFriendRequests.map(function(pendingFriendRequest){
              return User.findById(pendingFriendRequest._id).exec()
                .then(function(pendingFriendRequestUser){
                  data.pendingFriendRequests.push({
                    username: pendingFriendRequestUser.username
                  });
                });
            }));
          });
      }).then(function(){
        socket.emit("user.info.me", data);
      });
  };

  var broadcastUserStatus = function(socket){
    var userId = getUserIdFromSocket(socket);
    if(userId == null) return Promise.reject("Cannot get UserId");
    return getStatusIdFromUserId(userId).then(function(statusId){
        return User.findById(userId).exec()
          .then(function(user){
            return Promise.all(user.friends.map(function(friend){
              return getSocketFromUserId(friend._id).then(function(friendSocket){
                if(friendSocket != null) friendSocket.emit("user.status", {username: user.username, statusId: filterStatusId(statusId)});
              });
            }))
          });
      });
  };

  io.on("connection", function(socket){
    // If the socket is a logged-in user
    if(getUserIdFromSocket(socket) != null){

      // Send the User their information
      sendUserInfo(socket).catch(err => {throw err});
      // Broadcast the User's status (now that they're online)
      broadcastUserStatus(socket).catch(err => {throw err});

      // User Sets their Status
      socket.on("user.status.set", function(data){
        // Clean the data
        var newStatusId = (data.statusId > User.Status.Offline && data.statusId <= User.Status.Invisible ? data.statusId : User.Status.Online);
        // Update the user statusId
        User.findOneAndUpdate({_id: getUserIdFromSocket(socket)}, {$set: {statusId: newStatusId}}).exec()
          .then(function(){
            // Send the User their information
            return sendUserInfo(socket).then(function(){
                // Broadcast their new status
                return broadcastUserStatus(socket);
              });
          }).catch(err => {throw err});
      });

      // User Removes friend
      socket.on("user.friends.remove", function(data){
        // Remove the user from the friend's friends
        User.findOneAndUpdate({username: data.username}, {$pull: {friends: {_id: getUserIdFromSocket(socket)}}}).exec()
          .then(function(friendUser){
            // Update the user friends
            return User.findOneAndUpdate({_id: getUserIdFromSocket(socket)}, {$pull: {friends: {_id: friendUser._id}}}).exec()
              .then(function(){
                // Send the User their information
                return sendUserInfo(socket).then(function(){
                  // Send the friend their information if they have a socket open
                  return getSocketFromUserId(friendUser._id).then(function(friendSocket){
                    if(friendSocket != null) return sendUserInfo(friendSocket);
                  });
                });
              });
          }).catch(err => {throw err});
      });

      // User Sends Friend Request to User
      socket.on("user.friends.request.send", function(data){
        // Check if the potential friend already has the user as a friend
        User.findOne({username: data.username}).exec()
          .then(function(friendUser){
            return Promise.all(friendUser.friends.map(function(friend){
              // If the potential friend DOES have the user as a friend
              if((friend._id).toString() == getUserIdFromSocket(socket).toString()) return Promise.reject();
            })).then(function(){
              // If the potential friend DOES NOT have the user as a friend
              // Check if the potential friend already has a friend request from the user
              return Promise.all(friendUser.pendingFriendRequests.map(function(pendingFriendRequest){
                  // If the potential friend DOES have a friend request from the user
                  if((pendingFriendRequest._id).toString() == getUserIdFromSocket(socket).toString()) return Promise.reject();
                })).then(function(){
                  // If the potential friend DOES NOT have a friend request from the user
                  // Update the potential friend's pendingFriendRequests
                  return User.findOneAndUpdate({username: data.username}, {$push: {pendingFriendRequests: {_id: getUserIdFromSocket(socket)}}}).exec()
                    .then(function(){
                      // Send the potential friend their information if they have a socket open
                      return getSocketFromUserId(friendUser._id).then(function(friendUserSocket){
                        if(friendUserSocket != null) return sendUserInfo(friendUserSocket);
                      });
                    });
                }).catch(reject => {return Promise.resolve()});
            }).catch(reject => {return Promise.resolve()});
          }).catch(err => {throw err});
      });

      // User Confirms/Denies Friend Request
      socket.on("user.friends.request.response", function(data){
        // Find the friend user to be confirmed/denied
        User.findOne({username: data.username}).exec()
          .then(function(friendUser){
            // Remove the friend the users pendingFriendRequests
            return User.findOneAndUpdate({_id: getUserIdFromSocket(socket)}, {$pull: {pendingFriendRequests: {_id: friendUser._id}}}).exec()
              .then(function(){
                if(data.confirm){
                  // If the user confirms the friend request
                  // Add the friend to the user's friends
                  return User.findOneAndUpdate({_id: getUserIdFromSocket(socket)}, {$push: {friends: {_id: friendUser._id}}}).exec()
                    .then(function(){
                      // Add the user to the friend's friends
                      return User.findOneAndUpdate({_id: friendUser._id}, {$push: {friends: {_id: getUserIdFromSocket(socket)}}}).exec()
                        .then(function(){
                          // Send the friend their information if they have a socket open
                          return getSocketFromUserId(friendUser._id).then(function(friendUserSocket){
                            if(friendUserSocket != null) return sendUserInfo(friendUserSocket);
                          });
                        });
                    });
                }
              }).then(function(){
                // Send the user their information
                return sendUserInfo(socket);
              });
        }).catch(err => {throw err});
      });

      // User Searches for Users
      socket.on("user.search", function(data){
        User.find({username: {$regex: data.username}}).exec()
          .then(function(searchUsers){
            var returnUsers = [];
            return Promise.all(searchUsers.map(function(searchUser){
              if((searchUser._id).toString() != getUserIdFromSocket(socket).toString()) returnUsers.push({username: searchUser.username});
            })).then(function(){
              socket.emit("user.search.results", returnUsers);
            });
          }).catch(err => {throw err});
      });

      // User Disconnects
      socket.on("disconnect", function(){
        // Broadcast
        broadcastUserStatus(socket).catch(err => {throw err});
      });
    }
  });

  // Return: Promise(Array of all open sockets in namespace)
  var getOpenSocketsInNamespace = function(namespace){
    var sockets = [];
    return Promise.all(Object.keys(io.nsps[namespace].sockets).map(function(socketId){
      sockets.push(io.nsps[namespace].sockets[socketId]);
    })).then(function(){
      return Promise.resolve(sockets);
    });
  };

  // Return: Promise(Array of  of UserId in namespace)
  var getArrayOfUserIdInNamespace = function(namespace){
    var userIds = [];
    return getOpenSocketsInNamespace(namespace).then(function(sockets){
      return Promise.all(sockets.map(function(socket){
        var uid = getUserIdFromSocket(socket);
        if(uid != null) userIds.push(uid);
      })).then(function(){
        return Promise.resolve(userIds);
      });
    });
  };

  // Send the namespace the user list
  // Return: Promise(reject/resolve of success)
  var sendNamespaceUserList = function(namespace, broadcast){
    var users = [];
    return getArrayOfUserIdInNamespace(namespace).then(function(userIds){
      return Promise.all(userIds.map(function(userId){
        return User.findById(userId).exec()
          .then(function(user){
            return getStatusIdFromUserId(userId).then(function(statusId){
              users.push({username: user.username, statusId: filterStatusId(statusId)});
            });
          });
      })).then(function(){
        io.of(namespace).emit(broadcast, users);
      });
    });
  };

  io.of("/lobby").on("connection", function(socket){
    // If the socket is a logged-in user
    if(getUserIdFromSocket(socket) != null){

      // Send the lobby the user list (now that user has joined)
      sendNamespaceUserList("/lobby", "lobby.chat.users").catch(err => {throw err});

      // User sends a message to the lobby
      socket.on("lobby.chat.sendMessage", function(data){
        if(data.text != null && !( /^[\s]*$/.test(data.text) )){
          User.findById(getUserIdFromSocket(socket)).exec()
            .then(function(user){
              io.of("/lobby").emit("lobby.chat.message", {username: user.username, text: data.text});
            }).catch(err => {throw err});
        }
      });

      socket.on("disconnect", function(){
        // Send the lobby the user list (now that user has left)
        sendNamespaceUserList("/lobby", "lobby.chat.users").catch(err => {throw err});
      });
    }
  });

  return server;
};
