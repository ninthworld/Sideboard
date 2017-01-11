'use strict';

var WebApp = angular.module("WebApp", ['ngMaterial', 'ngAnimate', 'FBAngular']);

WebApp.controller("AppController", function($scope, $interval, $http, Fullscreen, $mdDialog, socket){

  $scope.User = {
    username: "",
    friends: [],
    pendingFriendRequests: [],
    statusId: 0,
    _texts: ["Offline", "Online", "Away", "Busy", "Invisible"],
    getStatusClass: function(id){
      return "status-icon-" + this._texts[id].toLowerCase();
    },
    getStatusText: function(id){
      return this._texts[id];
    }
  };
  $scope.Fullscreen = {
    onToggle: function(){
      if(Fullscreen.isEnabled()){
        Fullscreen.cancel();
      }else{
        Fullscreen.all();
      }
    },
    isFullscreen: function(){
      Fullscreen.isEnabled();
    }
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
  $scope.FriendSearch = {
    searchText: "",
    users: []
  };

  socket.on("connect", function(){
    socket.on("me:user:init", function(data){
      $scope.User.username = data.username;
      $scope.User.statusId = data.statusId;
      $scope.User.friends = data.friends;
      $scope.User.pendingFriendRequests = data.pendingFriendRequests;
    });

    socket.on("me:status:update", function(data){
      $scope.User.statusId = data.statusId;
    });

    socket.on("all:status:update", function(data){
      for(var i=0; i<$scope.User.friends.length; i++){
        if($scope.User.friends[i].username == data.username){
          $scope.User.friends[i].statusId = data.statusId;
        }
      }
    });

    socket.on("me:user:searchResults", function(data){
      $scope.FriendSearch.users = data.users;
    });
  });

  $scope.onSetStatusId = function(statusId){
    socket.emit("me:status:set", {statusId: statusId});
  };

  $scope.onRemoveFriend = function(friendUsername){
    socket.emit("me:friend:remove", {username: friendUsername});
  };

  $scope.onFriendSearch = function(searchText){
    socket.emit("me:user:search", {username: searchText});
  };

  $scope.onSendFriendRequest = function(friendUsername){
    socket.emit("me:friend:request:send", {username: friendUsername});
  };

  $scope.onPendingFriendResponse = function(confirm, friendUsername){
    socket.emit("me:friend:request:response", {confirm: confirm, username: friendUsername});
  };

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
