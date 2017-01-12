'use strict';

var WebApp = angular.module("WebApp", ['ngMaterial', 'ngAnimate', 'FBAngular']);

WebApp.controller("AppController", function($rootScope, $scope, $interval, $http, Fullscreen, $mdDialog, socket){
  $rootScope.users = [];
  $rootScope.getUser = function(username){
    for(var i=0; i<$rootScope.users.length;i++){
      if($rootScope.users[i].username == username) return $rootScope.users[i];
    }
    return {username: "null", statusId: 0};
  };
  $rootScope.setUser = function(username, statusId){
    for(var i=0; i<$rootScope.users.length;i++){
      if($rootScope.users[i].username == username){
        $rootScope.users[i].statusId = statusId;
        return true;
      }
    }
    $rootScope.users.push({username: username, statusId: statusId});
    return false;
  };

  $scope.Fullscreen = Fullscreen;
  $scope.User = {
    username: "",
    friends: [],
    pendingFriendRequests: [],
    //statusId: 0,
    _texts: ["Offline", "Online", "Away", "Busy", "Invisible"],
    getStatusClass: function(id){
      return "status-icon-" + this._texts[id].toLowerCase();
    },
    getStatusText: function(id){
      return this._texts[id];
    },
    getStatus: function(){
      return $rootScope.getUser(this.username).statusId;
    },
    getFriends: function(){
      var friends = [];
      for(var i=0; i<this.friends.length; i++){
        var friend = $rootScope.getUser(this.friends[i].username);
        friends.push(friend);
      }
      return friends;
    }
  };
  $scope.FriendSearch = {
    searchText: "",
    users: []
  };
  $scope.Navbar = {
    _mouse: false,
    _toggle: false,
    Profile: {
      _toggle: false,
      onToggle: function(){
        this._toggle = !this._toggle;
      },
      isOpen: function(){
        return this._toggle;
      },
      getProfileClass: function(){
        return (this._toggle ? 'avatar-profile-opened' : 'avatar-profile-closed');
      }
    },
    onToggle: function(){
      this._toggle = !this._toggle;
    },
    onMouseEnter: function(){
      this._mouse = true;
    },
    onMouseLeave: function(){
      this._mouse = false;
    },
    isOpen: function(){
      if(!(this._mouse || this._toggle)) this.Profile._toggle = false;
      return (this._mouse || this._toggle);
    },
    getNavClass: function(){
      return ((this._mouse || this._toggle) ? 'navbar-opened' : 'navbar-closed');
    },
    getLogoClass: function(){
      return ((this._mouse || this._toggle) ? 'logo-opened' : 'logo-closed');
    }
  };

  socket.on("connect", function(){
    socket.on("user.info.me", function(data){
      $scope.User.username = data.username;
      $rootScope.setUser(data.username, data.statusId);
      //$scope.User.statusId = data.statusId;
      //$scope.User.friends = data.friends;
      $scope.User.friends = [];
      for(var i=0; i<data.friends.length; i++){
        $scope.User.friends.push({username: data.friends[i].username});
        $rootScope.setUser(data.friends[i].username, data.friends[i].statusId);
      }
      $scope.User.pendingFriendRequests = data.pendingFriendRequests;
    });

    socket.on("user.status", function(data){
      // for(var i=0; i<$scope.User.friends.length; i++){
      //   if($scope.User.friends[i].username == data.username){
      //     $scope.User.friends[i].statusId = data.statusId;
      //   }
      // }
      $rootScope.setUser(data.username, data.statusId);
    });

    socket.on("user.search.results", function(data){
      $scope.FriendSearch.users = data;
    });
  });

  $scope.onSetStatusId = function(statusId){
    socket.emit("user.status.set", {statusId: statusId});
  };

  $scope.onRemoveFriend = function(friendUsername){
    socket.emit("user.friends.remove", {username: friendUsername});
  };

  $scope.onSendFriendRequest = function(friendUsername){
    socket.emit("user.friends.request.send", {username: friendUsername});
  };

  $scope.onPendingFriendResponse = function(confirm, friendUsername){
    socket.emit("user.friends.request.response", {username: friendUsername, confirm: confirm});
  };

  $scope.onFriendSearch = function(searchText){
    if(searchText != null && !( /^[\s]*$/.test(searchText) )){
      socket.emit("user.search", {username: searchText});
    }
  };

  // $scope.onSendLobbyChatMessage = function(message){
  //   socket.emit("lobby.chat.sendMessage", {text: message});
  //   $scope.LobbyChat.messageText = "";
  // };

  $scope.showFriendsDialog = function(ev){
    $mdDialog.show({
      controller: "DialogController",
      templateUrl: "html/friendsDialog.html",
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true,
      locals: {
        $parentScope: $scope
      }
    });
  };

  $scope.showAddFriendDialog = function(ev){
    $mdDialog.show({
      controller: "DialogController",
      templateUrl: "html/addFriendDialog.html",
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true,
      locals: {
        $parentScope: $scope
      }
    });
  };

  $scope.showRemoveFriendConfirmDialog = function(ev, friendName){
    $mdDialog.show(
        $mdDialog.confirm()
          .title("Confirm")
          .textContent("Are you sure you want to remove " + friendName + " from your friends?")
          .targetEvent(ev)
          .ok("Remove")
          .cancel("Cancel")
      ).then(function(){
        // Confirmed
        $scope.onRemoveFriend(friendName);
      }, function(){
        // Cancelled
      });
  };

  var originatorEv;
  $scope.openMenu = function($mdOpenMenu, ev){
    originatorEv = ev;
    $mdOpenMenu(ev);
  };
});

WebApp.controller("DialogController", function($scope, $mdDialog, $parentScope){
  $scope.hide = function() {
    $mdDialog.hide();
  };

  $scope.cancel = function() {
    $mdDialog.cancel();
  };

  $scope.answer = function(answer) {
    $mdDialog.hide(answer);
  };

  $scope.parentScope = $parentScope;
});

WebApp.config(function($mdThemingProvider){
  $mdThemingProvider.theme("toolbar");
});

WebApp.factory("socket", function($rootScope){
  var socket = io("/", { transports: ['websocket'] });
  return {
    on: function(eventName, callback){
      socket.on(eventName, function(){
        var args = arguments;
        $rootScope.$apply(function(){
          callback.apply(socket, args);
        });
      });
    },
    emit: function(eventName, data, callback){
      socket.emit(eventName, data, function(){
        var args = arguments;
        $rootScope.$apply(function(){
          if(callback){
            callback.apply(socket, args);
          }
        });
      });
    }
  };
});

WebApp.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});
