'use strict';

WebApp.controller("GameController", function($rootScope, $scope, $timeout, $interval, $http, Fullscreen, $mdDialog, socketGame, $q){

  $scope.GameUsers = [];

  socketGame.on("connect", function(){
    socketGame.on("game.users", function(data){
      $scope.GameUsers = [];
      for(var i=0; i<data.length; i++){
        $scope.GameUsers.push({username: data[i].username});
        $rootScope.setUser(data[i].username, data[i].statusId);
      }
      console.log($scope.GameUsers);
    });
  });

  var originatorEv;
  $scope.openMenu = function($mdOpenMenu, ev){
    originatorEv = ev;
    $mdOpenMenu(ev);
  };
});

WebApp.factory("socketGame", function($rootScope, $location){
  var socket = io("/game", { transports: ['websocket'], query: {gid: $location.search()["gid"]} });
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
