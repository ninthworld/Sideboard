'use strict';

App.service("GameSocketService", function(GameSocketFactory, GameUsersService, UsersService, GameChatService, GameConfigService){
  var socket = GameSocketFactory;

  socket.on("connect", function(){
    socket.on("game.info", function(data){
      GameConfigService.setGameConfig(data);
    });

    socket.on("game.users.connected", function(data){
      console.log(data);
      GameUsersService.setUsers(data);
      for(var i=0; i<data.length; i++){
        UsersService.setUser(data[i]);
      }
    });

    socket.on("game.chat.message", function(data){
      GameChatService.addMessage(data);

      $timeout(function(){
        var container = document.getElementsByClassName("game-chatbox-display")[0];
        var containerHeight = container.clientHeight;
        var contentHeight = container.scrollHeight;
        container.scrollTop = contentHeight - containerHeight;
      }, 100);
    });
  });

  this.onSendGameChatMessage = function(message){
    if(message != null && !( /^[\s]*$/.test(message) )){
      socket.emit("game.chat.sendMessage", {text: message});
      GameChatService.messageText = "";
    }
  };

});

App.service("GameConfigService", function(){
  var game = {};
  this.setGameConfig = function(data){ game = data; };
  this.getGameConfig = function(){ return game; };
});

App.service("GameSidebarService", function(){
  var _toggle = true;
  this.onToggle = function(){ _toggle = !_toggle; };
  this.isOpen = function(){ return _toggle; };
  this.getClass = function(){ return (this.isOpen() ? "game-sidebar-opened" : "game-sidebar-closed"); };
});

App.service("GameToolbarService", function(GameSidebarService){
  this.isOpen = function(){ return GameSidebarService.isOpen(); };
  this.getClass = function(){ return (this.isOpen() ? "game-toolbar-opened" : "game-toolbar-closed"); };
});

App.service("GameUsersService", function(){
  var _users = [];
  this.setUsers = function(data){ _users = data; };
  this.getUsers = function(){ return _users; };
});

App.service("GameChatService", function(){
  var _messages = [];
  this.messageText = "";
  this.getMessages = function(){ return _messages; };
  this.addMessage = function(data){ _messages.push(data); };
});
