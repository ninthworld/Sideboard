'use strict';

App.service("SocketService", function(SocketFactory, UserService, UsersService, AddFriendDialogService){
  var socket = SocketFactory;

  socket.on("connect", function(){
    socket.on("user.info.me", function(data){
      UserService.setUser(data);
    });

    socket.on("user.status", function(data){
      UsersService.setUser(data);
    });

    socket.on("user.search.results", function(data){
      AddFriendDialogService.setUsers(data);
    });
  });

  this.onSetStatusId = function(statusId){
    socket.emit("user.status.set", {statusId: statusId});
  };

  this.onRemoveFriend = function(friendUsername){
    socket.emit("user.friends.remove", {username: friendUsername});
  };

  this.onSendFriendRequest = function(friendUsername){
    socket.emit("user.friends.request.send", {username: friendUsername});
  };

  this.onPendingFriendResponse = function(confirm, friendUsername){
    socket.emit("user.friends.request.response", {username: friendUsername, confirm: confirm});
  };

  this.onFriendSearch = function(searchText){
    if(searchText != null && !( /^[\s]*$/.test(searchText) )){
      socket.emit("user.search", {username: searchText});
    }
  };
});

App.service("UserService", function(UsersService){
  var _data = {};

  this.getUsername = function(){
    return _data.username;
  };

  this.getFriends = function(){
    return _data.friends;
  }

  this.getPendingFriendRequests = function(){
    return _data.pendingFriendRequests;
  };

  this.getStatusId = function(){
    var user = UsersService.getUserByUsername(this.getUsername());
    if(user != null) return user.statusId;
    return -1;
  };

  this.setUser = function(data){
    _data.username = data.username;
    _data.friends = data.friends;
    _data.pendingFriendRequests = data.pendingFriendRequests;
    UsersService.setUser({username: data.username, statusId: data.statusId});
    for(var i=0; i<data.friends.length; i++){
      UsersService.setUser({username: data.friends[i].username, statusId: data.friends[i].statusId});
    }
  };
});

App.service("UsersService", function(){
  var _users = [];

  this.getUserByUsername = function(username){
    for(var i=0; i<_users.length; i++){
      if(_users[i].username.toString() == username.toString()){
        return _users[i];
      }
    }
    return null;
  };

  this.setUser = function(data){
    return new Promise((resolve, reject) => {
      for(var i=0; i<_users.length; i++){
        if(_users[i].username.toString() == data.username.toString()){
          _users[i] = data;
          return resolve(_users[i]);
        }
      }
      return resolve(_users.push(data));
    });
  };
});
