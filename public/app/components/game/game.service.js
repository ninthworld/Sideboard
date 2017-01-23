'use strict';

App.service("GameSocketService", function(GameSocketFactory, GameUsersService, UsersService, GameChatService, GameConfigService, GameService, GameDecksService, $timeout, $window){
  var socket = GameSocketFactory;

  socket.on("connect", function(){
    socket.on("game.info", function(data){
      GameConfigService.setTitle(data.title);
      GameConfigService.setLocked(data.isLocked);
      GameConfigService.setFormatId(data.config.formatId);
      GameConfigService.setTypeId(data.config.typeId);
      GameConfigService.setTypeCount(data.config.typeCount);

      // GameDecksService

      GameService.setRunning(data.game.isRunning);
      GameService.setPlayers(data.game.players);

      GameUsersService.setLeader(data.leader);
      GameUsersService.setUsers(data.users);
      for(var i=0; i<data.users.length; i++){
        UsersService.setUser({username: data.users[i].username, avatar: data.users[i].avatar, statusId: data.users[i].statusId});
      }
    });

    socket.on("game.users.connected", function(data){
      GameUsersService.setConnectedUsers(data);
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

  this.onLeaveGame = function(){
    socket.emit("game.leave", {});
    $window.location.href = "/lobby";
  };

  this.onTeamSelect = function(teamId){
    socket.emit("game.team.select", {teamId: teamId});
  };

  this.onReadyToggle = function(){
    socket.emit("game.ready.toggle", {});
  };

  // Leader Only Commands
  // Game Not Running
  this.onSaveSettings = function(data){
    socket.emit("game.leader.settings", data);
  };
  
  this.onDeleteGame = function(){
    socket.emit("game.leader.delete", {});
  };

  this.onAddPlayer = function(username){
    socket.emit("game.leader.add", {username: username});
  };

  this.onRemovePlayer = function(username){
    socket.emit("game.leader.remove", {username: username});
  };

  this.onPromoteLeader = function(username){
    socket.emit("game.leader.promote", {username: username});
  };

  this.onMutePlayer = function(username){
    socket.emit("game.leader.mute", {username: username});
  };

  this.onUnmutePlayer = function(username){
    socket.emit("game.leader.unmute", {username: username});
  };

  this.onKickPlayer = function(username){
    socket.emit("game.leader.kick", {username: username});
  };

});

App.service("GameService", function(){
  var _isRunning = false;
  var _players = [];

  this.isPlayerByUsername = function(username){
    for(var i=0; i<_players.length; i++){
      if(_players[i].username == username){
        return true;
      }
    }
    return false;
  };

  this.isRunning = function(){ return _isRunning; };
  this.setRunning = function(data){ _isRunning = data; };

  this.isReadyByUsername = function(username){
    var player = this.getPlayerByUsername(username);
    if(player == null) return false;
    return player.isReady;
  };

  this.getPlayerByUsername = function(username){
    for(var i=0; i<_players.length; i++){
      if(_players[i].username == username){
        return _players[i];
      }
    }
    return null;
  };

  this.setPlayer = function(data){
    for(var i=0; i<_players.length; i++){
      if(_players[i].username == data.username){
        _players[i] = data;
      }
    }
    _players.push(data);
  };
  this.setPlayers = function(data){ _players = data; };
});

App.service("GameConfigService", function(){
  var _title = "";
  var _isLocked = false;
  var _formatId = 0;
  var _typeId = 0;
  var _typeCount = 0;

  this.setTitle = function(data){ _title = data; };
  this.getTitle = function(){ return _title; };
  this.setLocked = function(data){ _isLocked = data; };
  this.isLocked = function(){ return _isLocked; };
  this.setFormatId = function(data){ _formatId = data; };
  this.getFormatId = function(){ return _formatId; };
  this.setTypeId = function(data){ _typeId = data; };
  this.getTypeId = function(){ return _typeId; };
  this.setTypeCount = function(data){ _typeCount = data; };
  this.getTypeCount = function(){ return _typeCount; };
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
  var _allUsers = [];

  var _leader = "";
  this.getLeader = function(){ return _leader; };
  this.setLeader = function(data){ _leader = data; };
  this.isLeaderByUsername = function(username){ return (this.getLeader() == username); };

  var _users = [];
  this.setUsers = function(data){
    _users = data;
  };
  this.setConnectedUsers = function(data){
    for(var i=0; i<_users.length; i++){
      _users[i].isConnected = false;
    }
    for(var i=0; i<data.length; i++){
      for(var j=0; j<_users.length; j++){
        if(_users[j].username == data[i].username){
          _users[j].isConnected = true;
        }
      }
    }
  };
  this.getUsers = function(){
    return _users;
  };
});

App.service("GameDecksService", function(){
  var _decks = [];

  this.setDecks = function(data){ _decks = data; };
  this.getDeckById = function(id){
    for(var i=0; i<_decks.length; i++){
      if(_decks[i]._id == id) return _decks[i];
    }
    return null;
  };
});

App.service("GameChatService", function(){
  var _messages = [];
  this.messageText = "";
  this.getMessages = function(){ return _messages; };
  this.addMessage = function(data){ _messages.push(data); };
});
