'use strict';

var Mongoose = require("mongoose");
var config = require("./config");
var redis = require("redis").createClient;
var adapter = require("socket.io-redis");

var User = require("./models/user");
var Game = require("./models/game");

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
    require("./session")(socket.request, {}, next);
  });

  // Return: UserId from a Socket
  var getUserIdFromSocket = function(socket){
    if(socket && socket.request && socket.request.session && socket.request.session.passport) return socket.request.session.passport.user;
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
      pendingFriendRequests: [],
      games: [],
      decks: []
    };

    var userId = getUserIdFromSocket(socket);
    if(userId == null) return Promise.reject("Cannot get UserId");
    return User.findById(userId).exec()
      .then(function(user){
        data.username = user.username;
        data.statusId = user.statusId;
        data.avatar = user.avatar;

        return Promise.all(user.friends.map(function(friend){
          return User.findById(friend._id).exec()
            .then(function(friendUser){
              return getStatusIdFromUserId(friend._id)
                .then(function(friendStatusId){
                  data.friends.push({
                    username: friendUser.username,
                    avatar: friendUser.avatar,
                    statusId: filterStatusId(friendStatusId)
                  });
                });
            });
          })).then(function(){
            return Promise.all(user.pendingFriendRequests.map(function(pendingFriendRequest){
              return User.findById(pendingFriendRequest._id).exec()
                .then(function(pendingFriendRequestUser){
                  return getStatusIdFromUserId(pendingFriendRequest._id)
                    .then(function(pendingFriendStatusId){
                      data.pendingFriendRequests.push({
                        username: pendingFriendRequestUser.username,
                        avatar: pendingFriendRequestUser.avatar,
                        statusId: filterStatusId(pendingFriendStatusId)
                      });
                    });
                });
            }));
          }).then(function(){
            return Promise.all(user.games.map(function(game){
              return Game.findById(game._id).exec()
                .then(function(gameGame){
                  data.games.push({
                    id: gameGame._id,
                    title: gameGame.title,
                    isLocked: gameGame.isLocked,
                    config: {
                      typeId: gameGame.config.typeId,
                      typeCount: gameGame.config.typeCount,
                      formatId: gameGame.config.formatId
                    },
                    game: {
                      isRunning: gameGame.game.isRunning
                    }
                  });
                });
            }));
          }).then(function(){
            return Promise.all(user.decks.map(function(deck){
              // return Deck.findById(deck._id).exec()
              //   .then(function(deckDeck){
              //     data.decks.push({});
              //   });
              data.decks.push({
                _id: deck._id
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
                if(friendSocket != null) friendSocket.emit("user.status", {username: user.username, avatar: user.avatar, statusId: filterStatusId(statusId)});
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
              if((searchUser._id).toString() != getUserIdFromSocket(socket).toString()){
                return getStatusIdFromUserId(searchUser._id)
                    .then(function(searchUserStatusId){
                      returnUsers.push({
                        username: searchUser.username,
                        avatar: searchUser.avatar,
                        statusId: filterStatusId(searchUserStatusId)
                      });
                    });
              }
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
              users.push({username: user.username, avatar: user.avatar, statusId: filterStatusId(statusId)});
            });
          });
      })).then(function(){
        io.of(namespace).emit(broadcast, users);
      });
    });
  };

  // Send the user the games list
  // Return: Promise(reject/resolve of success)
  var sendUserGameList = function(socket){
    var data = [];
    return Game.find({}).exec()
        .then(function(games){
          return Promise.all(games.map(function(game){
            data.push({
              id: game._id,
              title: game.title,
              isLocked: game.isLocked,
              config: {
                typeId: game.config.typeId,
                typeCount: game.config.typeCount,
                formatId: game.config.formatId
              },
              game: {
                isRunning: game.game.isRunning
              }
            });
          }))
          .then(function(){
            socket.emit("lobby.games", data);
          });
        });
  };

  io.of("/lobby").on("connection", function(socket){
    // If the socket is a logged-in user
    if(getUserIdFromSocket(socket) != null){
      var _userId = getUserIdFromSocket(socket);

      // Send the lobby the user list (now that user has joined)
      sendNamespaceUserList("/lobby", "lobby.chat.users").catch(err => {throw err});

      // Send the user the list of games
      sendUserGameList(socket).catch(err => {throw err});

      // User sends a message to the lobby
      socket.on("lobby.chat.sendMessage", function(data){
        if(data.text != null && !( /^[\s]*$/.test(data.text) )){
          User.findById(getUserIdFromSocket(socket)).exec()
            .then(function(user){
              io.of("/lobby").emit("lobby.chat.message", {username: user.username, text: data.text});
            }).catch(err => {throw err});
        }
      });

      // User asks for list of games
      socket.on("lobby.games.update", function(data){
        sendUserGameList(socket).catch(err => {throw err});
      });

      socket.on("disconnect", function(){
        // Send the lobby the user list (now that user has left)
        sendNamespaceUserList("/lobby", "lobby.chat.users").catch(err => {throw err});
      });
    }
  });

  var findInArray = function(array, item){
    return new Promise((resolve, reject) => {
      Promise.all(array.map(function(i){
        if(i._id.toString() == item.toString()) resolve();
      })).then(function(){
        reject();
      });
    });
  };

  var getOpenSocketsInRoomNamespace = function(room, namespace){
    var sockets = [];
    if(io.nsps[namespace] && io.nsps[namespace].adapter && io.nsps[namespace].adapter.rooms[room]){
      return Promise.all(Object.keys(io.nsps[namespace].adapter.rooms[room].sockets).map(function(socketId){
          sockets.push(io.sockets.sockets[socketId.replace(namespace+"#","")]);
        })).then(function(){
          return Promise.resolve(sockets);
        });
    }
    return Promise.reject();
  };

  var getArrayOfUserIdInRoomNamespace = function(room, namespace){
    var userIds = [];
    return getOpenSocketsInRoomNamespace(room, namespace).then(function(sockets){
        return Promise.all(sockets.map(function(socket){
          var uid = getUserIdFromSocket(socket);
          if(uid != null) userIds.push(uid);
        })).then(function(){
          return Promise.resolve(userIds);
        });
      });
  };

  var sendRoomConnectedList = function(room, namespace){
    var users = [];
    return getArrayOfUserIdInRoomNamespace(room, namespace).then(function(userIds){
      return Promise.all(userIds.map(function(userId){
          return User.findById(userId).exec()
            .then(function(user){
              return getStatusIdFromUserId(userId).then(function(statusId){
                users.push({username: user.username, avatar: user.avatar, statusId: filterStatusId(statusId)});
              });
            });
        })).then(function(){
          io.of(namespace).to(room).emit("game.users.connected", users);
        });
      });
  };

  var getGameInfo = function(gameId){
    return Game.findById(Mongoose.Types.ObjectId(gameId)).exec()
      .then(function(game){
        var data = {};
        data.title = game.title;
        data.isLocked = game.isLocked;
        data.users = [];
        data.game = {
          isRunning: game.game.isRunning,
          players: []
        };
        data.config = {
          formatId: game.config.formatId,
          typeId: game.config.typeId,
          typeCount: game.config.typeCount
        };

        return User.findById(Mongoose.Types.ObjectId(game.leaderId)).exec()
          .then(function(user){
            data.leader = user.username;

            return Promise.all(game.users.map(function(userData){
                return User.findById(Mongoose.Types.ObjectId(userData._id)).exec()
                  .then(function(user){
                    return getStatusIdFromUserId(userData._id).then(function(statusId){
                      data.users.push({username: user.username, avatar: user.avatar, statusId: filterStatusId(statusId), isMuted: userData.isMuted});
                    });
                  });
              })).then(function(){
                return Promise.all(game.game.players.map(function(playerData){
                  return User.findById(Mongoose.Types.ObjectId(playerData._id)).exec()
                    .then(function(user){
                      data.game.players.push({username: user.username, teamId: playerData.teamId, isReady: playerData.isReady, deckId: playerData.deckId});
                    });
                }));
              }).then(function(){
                return Promise.resolve(data);
              });
          });
      });
  };

  var sendRoomGameInfo = function(room, namespace, gameId){
    return getGameInfo(gameId).then(function(data){
        io.of(namespace).to(room).emit("game.info", data);
      });
  };

  var removeUserFromGame = function(userId, gameId){
    return Game.findOneAndUpdate({_id: gameId}, {$pull: {users: {_id: userId}}}).exec()
      .then(function(game){
        return Game.findOneAndUpdate({_id: gameId}, {$pull: {"game.players": {_id: userId}}}).exec()
          .then(function(){
            return Promise.resolve(game);
          }).catch(function(){
            return Promise.resolve(game);
          });
      }).then(function(game){
        if((game.leaderId).toString() == userId.toString()){
          return (new Promise((resolve, reject) => {
            Promise.all(game.users.map(function(user){
              if((user._id).toString() != userId.toString()) return resolve(user);
            })).then(function(){
              return reject();
            });
          })).then(function(user){
            // Set user as leader
            return Game.findOneAndUpdate({_id: gameId}, {leaderId: user._id}).exec()
          }).catch(function(){
            // No more users in the game, remove the game entirely
            return Game.findById(gameId).remove().exec();
          });
        }
      }).then(function(){
        // Remove Game from user's data
        console.log("Going to remove game from user");
        return new Promise((resolve, reject) => 
          User.findOneAndUpdate({_id: userId}, {$pull: {games: {_id: gameId}}}).exec()
            .then(function(){
              resolve(); 
            }).catch(function(){
              resolve(); 
            })
          );
      });
  };

  io.of("/game").on("connection", function(socket){
    // If the socket is a logged-in user AND a gameid is sent
    if(getUserIdFromSocket(socket) != null && socket.handshake.query["gid"] != null && Mongoose.Types.ObjectId.isValid(socket.handshake.query["gid"])){
      var _userId = Mongoose.Types.ObjectId(getUserIdFromSocket(socket));
      var _gameId = Mongoose.Types.ObjectId(socket.handshake.query["gid"]);
      var _room = "game_" + _gameId;

      socket.join(_room);

      // Send Users Game Info
      sendRoomGameInfo(_room, "/game", _gameId).then(function(){
        // Send Users Connected Users
        return sendRoomConnectedList(_room, "/game");
      }).catch(err => {});

      // User sends a message to the game
      socket.on("game.chat.sendMessage", function(data){
        if(data.text != null && !( /^[\s]*$/.test(data.text) )){
          Game.findById(_gameId).exec()
            .then(function(game){
              return Promise.all(game.users.map(function(user){
                if((user._id).toString() == _userId.toString() && user.isMuted) return Promise.reject();
              })).then(function(){
                // User is not muted
                return User.findById(getUserIdFromSocket(socket)).exec()
                  .then(function(user){
                    io.of("/game").to(_room).emit("game.chat.message", {username: user.username, text: data.text});
                  }).catch(err => {throw err});
              }).catch(function(){
                // User is muted;
                return Promise.resolve();
              });
            });          
        }
      });

      // User leaves game
      socket.on("game.leave", function(data){
        removeUserFromGame(_userId, _gameId).then(function(){
            // Send Users Game Info
            return sendRoomGameInfo(_room, "/game", _gameId).then(function(){
                // Send Users Connected Users
                return sendRoomConnectedList(_room, "/game");
              }).then(function(){
                return getSocketFromUserId(_userId)
                  .then(function(socket){
                    return sendUserInfo(socket);
                  });
              }).catch(err => {});
          });
      });

      // User selects a team
      socket.on("game.team.select", function(data){
        Game.findById(_gameId).exec()
          .then(function(game){
            return new Promise((resolve, reject) => {
              Promise.all(game.game.players.map(function(player){
                if((player._id).toString() == _userId.toString()) return resolve();
              }));
              return reject();
            }).then(function(){
              // User is a player  
              return Game.findOneAndUpdate({_id: _gameId, "game.players._id": _userId}, {$set: {"game.players.$.teamId": (data.teamId == 2 ? 2 : 1)}}).exec()
                .then(function(){
                  // Send Users Game Info
                  return sendRoomGameInfo(_room, "/game", _gameId).then(function(){
                      // Send Users Connected Users
                      return sendRoomConnectedList(_room, "/game");
                    }).catch(err => {});
                });
            }).catch(function(){
              // User is not a player
              return Promise.resolve();
            });
          });
      });

      // User toggles ready
      socket.on("game.ready.toggle", function(data){
        Game.findById(_gameId).exec()
          .then(function(game){
            return new Promise((resolve, reject) => {
              Promise.all(game.game.players.map(function(player){
                if((player._id).toString() == _userId.toString()) return resolve(player.isReady);
              }));
              return reject();
            }).then(function(isReady){
              // User is a player  
              return Game.findOneAndUpdate({_id: _gameId, "game.players._id": _userId}, {$set: {"game.players.$.isReady": !isReady}}).exec()
                .then(function(){
                  // Send Users Game Info
                  return sendRoomGameInfo(_room, "/game", _gameId).then(function(){
                      // Send Users Connected Users
                      return sendRoomConnectedList(_room, "/game");
                    }).catch(err => {});
                });
            }).catch(function(){
              // User is not a player
              return Promise.resolve();
            });
          });
      });

      // Leader Only Commands
      // Game Not Running
      socket.on("game.leader.settings", function(data){
        Game.findById(_gameId).exec()
          .then(function(game){
            if((game.leaderId).toString() == _userId.toString() && !game.game.isRunning){
              return Game.findOneAndUpdate({_id: _gameId}, {$set: {
                title: data.title, 
                isLocked: data.isLocked, 
                "config.formatId": data.config.formatId, 
                "config.typeId": data.config.typeId,
                "config.typeCount": data.config.typeCount
              }}).exec().then(function(){
                  if(data.password != ""){
                    return Game.findOneAndUpdate({_id: _gameId}, {$set: {password: data.password}}).exec()
                      .then(function(){
                        return Game.findById(_gameId).exec()
                          .then(function(g){
                            g.save();
                          });
                      });
                  }
                }).then(function(){
                  // Send Users Game Info
                  return sendRoomGameInfo(_room, "/game", _gameId).then(function(){
                      // Send Users Connected Users
                      return sendRoomConnectedList(_room, "/game");
                    }).catch(err => {});
                });
            }
          });
      });

      socket.on("game.leader.delete", function(data){
        Game.findById(_gameId).exec()
          .then(function(game){
            if((game.leaderId).toString() == _userId.toString() && !game.game.isRunning){
              return Promise.all(game.users.map(function(user){
                return removeUserFromGame(user._id, _gameId).then(function(){
                    return getSocketFromUserId(user._id)
                      .then(function(socket){
                        return sendUserInfo(socket);
                      });
                  });
              })).then(function(){
                return Game.findById(_gameId).remove().exec()
                  .then(function(){
                    return getOpenSocketsInRoomNamespace(_room, "/game").then(function(sockets){
                      return Promise.all(sockets.map(function(socket){
                        socket.emit("game.kicked", {});
                      }));
                    });
                  });
              });              
            }
          });
      });

      socket.on("game.leader.add", function(data){
        Game.findById(_gameId).exec()
          .then(function(game){
            if((game.leaderId).toString() == _userId.toString() && !game.game.isRunning){
              return User.findOne({username: data.username}).exec()
                .then(function(user){
                  return Promise.all(game.game.players.map(function(player){
                    if((player._id).toString() == (user._id).toString()) return Promise.reject();
                  })).then(function(){
                    return Game.findOneAndUpdate({_id: _gameId}, {$push: {"game.players": {_id: user._id}}}).exec()
                      .then(function(){
                        // Send Users Game Info
                        return sendRoomGameInfo(_room, "/game", _gameId).then(function(){
                            // Send Users Connected Users
                            return sendRoomConnectedList(_room, "/game");
                          }).catch(err => {});
                      });
                  }).catch(function(){

                  });
                });
            }
          });
      });

      socket.on("game.leader.remove", function(data){
        Game.findById(_gameId).exec()
          .then(function(game){
            if((game.leaderId).toString() == _userId.toString() && !game.game.isRunning){
              return User.findOne({username: data.username}).exec()
                .then(function(user){
                  return Game.findOneAndUpdate({_id: _gameId}, {$pull: {"game.players": {_id: user._id}}}).exec()
                    .then(function(){
                      // Send Users Game Info
                      return sendRoomGameInfo(_room, "/game", _gameId).then(function(){
                          // Send Users Connected Users
                          return sendRoomConnectedList(_room, "/game");
                        }).catch(err => {});
                    });
                });
            }
          });
      });

      socket.on("game.leader.promote", function(data){
        Game.findById(_gameId).exec()
          .then(function(game){
            if((game.leaderId).toString() == _userId.toString() && !game.game.isRunning){
              return User.findOne({username: data.username}).exec()
                .then(function(user){
                  return Game.findOneAndUpdate({_id: _gameId}, {$set: {leaderId: user._id}}).exec()
                    .then(function(){
                      // Send Users Game Info
                      return sendRoomGameInfo(_room, "/game", _gameId).then(function(){
                          // Send Users Connected Users
                          return sendRoomConnectedList(_room, "/game");
                        }).catch(err => {});
                    });
                });
            }
          });
      });

      socket.on("game.leader.mute", function(data){
        Game.findById(_gameId).exec()
          .then(function(game){
            if((game.leaderId).toString() == _userId.toString() && !game.game.isRunning){
              return User.findOne({username: data.username}).exec()
                .then(function(user){
                  return Game.findOneAndUpdate({_id: _gameId, "users._id": user._id}, {$set: {"users.$.isMuted": true}}).exec()
                    .then(function(){
                      // Send Users Game Info
                      return sendRoomGameInfo(_room, "/game", _gameId).then(function(){
                          // Send Users Connected Users
                          return sendRoomConnectedList(_room, "/game");
                        }).catch(err => {});
                    });
                });
            }
          });
      });

      socket.on("game.leader.unmute", function(data){
        Game.findById(_gameId).exec()
          .then(function(game){
            if((game.leaderId).toString() == _userId.toString() && !game.game.isRunning){
              return User.findOne({username: data.username}).exec()
                .then(function(user){
                  return Game.findOneAndUpdate({_id: _gameId, "users._id": user._id}, {$set: {"users.$.isMuted": false}}).exec()
                    .then(function(){
                      // Send Users Game Info
                      return sendRoomGameInfo(_room, "/game", _gameId).then(function(){
                          // Send Users Connected Users
                          return sendRoomConnectedList(_room, "/game");
                        }).catch(err => {});
                    });
                });
            }
          });
      });

      socket.on("game.leader.kick", function(data){
        Game.findById(_gameId).exec()
          .then(function(game){
            if((game.leaderId).toString() == _userId.toString() && !game.game.isRunning){
              return User.findOne({username: data.username}).exec()
                .then(function(user){
                  return removeUserFromGame(user._id, _gameId).then(function(){
                    // Send Users Game Info
                    return sendRoomGameInfo(_room, "/game", _gameId).then(function(){
                        // Send Users Connected Users
                        return sendRoomConnectedList(_room, "/game");
                      }).then(function(){
                        return getSocketFromUserId(_userId)
                          .then(function(socket){
                            return sendUserInfo(socket);
                          });
                      }).catch(err => {});
                  }).then(function(){
                    return getSocketFromUserId(user._id).then(function(socket){
                        socket.emit("game.kicked", {});
                      });
                    });
                });
            }
          });
      });

      socket.on("disconnect", function(){
        // User disconnects from game room
        socket.leave(_room);

        // Send Everyone the list of users connected to the game
        sendRoomConnectedList(_room, "/game", "game.users.connected").catch(err => {});
      });
    }
  });

  return server;
};
