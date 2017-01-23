'use strict';

App.service("SocketService", function(SocketFactory, UserService, UsersService, AddFriendDialogService, $window, $timeout, $mdDialog){
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
      for(var i=0; i<data.length; i++){
        UsersService.setUser(data[i]);
      }
    });

    socket.on("game.kicked", function(data){
      $mdDialog.show(
        $mdDialog.alert()
          .clickOutsideToClose(true)
          .title("Kicked")
          .textContent("You have been kicked from the game.")
          .ok("Ok")
      ).finally(function(){
        $window.location.href = "/lobby";
      });
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

  this.getAvatar = function(){
    return _data.avatar;
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

  this.getGames = function(){
    return _data.games;
  };

  this.getDecks = function(){
    return _data.decks;
  };

  this.setUser = function(data){
    _data.username = data.username;
    _data.friends = data.friends;
    _data.avatar = data.avatar;
    _data.games = data.games;
    _data.decks = data.decks;
    _data.pendingFriendRequests = data.pendingFriendRequests;
    UsersService.setUser({
      username: data.username, 
      avatar: data.avatar, 
      statusId: data.statusId
    });
    for(var i=0; i<data.friends.length; i++){
      UsersService.setUser({
        username: data.friends[i].username, 
        avatar: data.friends[i].avatar, 
        statusId: data.friends[i].statusId
      });
    }
    for(var i=0; i<data.pendingFriendRequests.length; i++){
      UsersService.setUser({
        username: data.pendingFriendRequests[i].username, 
        avatar: data.pendingFriendRequests[i].avatar, 
        statusId: data.pendingFriendRequests[i].statusId
      });
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
