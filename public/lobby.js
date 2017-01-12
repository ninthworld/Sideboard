'use strict';

WebApp.controller("LobbyController", function($rootScope, $scope, $timeout, $interval, $http, Fullscreen, $mdDialog, socketLobby, $q){
  $scope.chips = [];
  $scope.LobbyChat = {
    _toggle: true,
    onToggle: function(){
      this._toggle = !this._toggle;
    },
    isOpen: function(){
      return this._toggle;
    },
    getToolbarClass: function(){
      return (this._toggle ? 'lobbychat-toolbar-opened' : 'lobbychat-toolbar-closed');
    },
    getClass: function(){
      return (this._toggle ? 'lobbychat-opened' : 'lobbychat-closed');
    },
    users: [],
    messages: [],
    messageText: "",
    getUsers: function(){
      var users = [];
      for(var i=0; i<this.users.length; i++){
        var user = $rootScope.getUser(this.users[i].username);
        users.push(user);
      }
      return users;
    }
  };

  socketLobby.on("connect", function(){
    socketLobby.on("lobby.chat.users", function(data){
      $scope.LobbyChat.users = [];
      for(var i=0; i<data.length; i++){
        $scope.LobbyChat.users.push({username: data[i].username});
        $rootScope.setUser(data[i].username, data[i].statusId);
      }
      // $scope.LobbyChat.users = data;
    });

    socketLobby.on("lobby.chat.message", function(data){
      $scope.LobbyChat.messages.push(data);

      $timeout(function(){
        var container = document.getElementsByClassName("lobbychat-chatbox-display")[0];
        var containerHeight = container.clientHeight;
        var contentHeight = container.scrollHeight;
        container.scrollTop = contentHeight - containerHeight;
      }, 100);
    });
  });

  $scope.onSendLobbyChatMessage = function(message){
    if(message != null && !( /^[\s]*$/.test(message) )){
      socketLobby.emit("lobby.chat.sendMessage", {text: message});
      $scope.LobbyChat.messageText = "";
    }
  };

  var originatorEv;
  $scope.openMenu = function($mdOpenMenu, ev){
    originatorEv = ev;
    $mdOpenMenu(ev);
  };
});

WebApp.factory("socketLobby", function($rootScope){
  var socket = io("/lobby", { transports: ['websocket'] });
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
