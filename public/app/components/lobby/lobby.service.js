'use strict';

App.service("LobbySocketService", function(LobbyGamesService, LobbySidebarService, LobbySocketFactory, LobbyUsersService, LobbyChatService, UsersService, $timeout){
  var socket = LobbySocketFactory;

  socket.on("connect", function(){
    socket.on("lobby.chat.users", function(data){
      LobbyUsersService.setUsers(data);
      for(var i=0; i<data.length; i++){
        UsersService.setUser(data[i]);
      }
    });

    socket.on("lobby.chat.message", function(data){
      LobbyChatService.addMessage(data);

      $timeout(function(){
        var container = document.getElementsByClassName("lobbychat-chatbox-display")[0];
        var containerHeight = container.clientHeight;
        var contentHeight = container.scrollHeight;
        container.scrollTop = contentHeight - containerHeight;
      }, 100);
    });

    socket.on("lobby.games", function(data){
      LobbyGamesService.setGames(data);
    });
  });

  this.onSendLobbyChatMessage = function(message){
    if(message != null && !( /^[\s]*$/.test(message) )){
      socket.emit("lobby.chat.sendMessage", {text: message});
      LobbyChatService.messageText = "";
    }
  };

  this.onRefreshGames = function(){
    socket.emit("lobby.games.update", {});
  };
});

App.service("LobbyGamesService", function(){
  var _games = [];
  this.getGames = function(){ return _games; };
  this.setGames = function(data){ _games = data; };
});

App.service("LobbySidebarService", function(){
  var _toggle = true;
  this.onToggle = function(){ _toggle = !_toggle; };
  this.isOpen = function(){ return _toggle; };
  this.getClass = function(){ return (this.isOpen() ? "lobbychat-opened" : "lobbychat-closed"); };
});

App.service("LobbyToolbarService", function(LobbySidebarService){
  this.isOpen = function(){ return LobbySidebarService.isOpen(); };
  this.getClass = function(){ return (this.isOpen() ? "lobbychat-toolbar-opened" : "lobbychat-toolbar-closed"); };
});

App.service("LobbyUsersService", function(){
  var _users = [];
  this.setUsers = function(data){ _users = data; };
  this.getUsers = function(){ return _users; };
});

App.service("LobbyChatService", function(){
  var _messages = [];
  this.messageText = "";
  this.getMessages = function(){ return _messages; };
  this.addMessage = function(data){ _messages.push(data); };
});

App.service("LobbySearchService", function(){
  this.searchText = "";
});

App.service("LobbyFilterService", function(LobbyGamesService, LobbySearchService, GameFormatFactory, GameTypeFactory){
  var _toggle = true;
  this.onToggle = function(){ _toggle = !_toggle; };
  this.isOpen = function(){ return _toggle; };

  this.transformChip = function(chip){
    if(angular.isObject(chip)) return chip;
    return {name: chip};
  };

  this.formatChips = [];
  this.formatSearchText = "";
  this.formatSelected = null;
  this.getFormatChips = function(){ return this.formatChips; };
  this.formatQuerySearch = function(){
    return GameFormatFactory.getFormats().filter((function filterFn(item){
      return (item.toLowerCase().indexOf(this.formatSearchText.toLowerCase()) >= 0);
    }).bind(this));
  };
  this.addFormatChip = function(){
    var items = this.formatQuerySearch();
    if(items.length > 0){
      if(this.getFormatChips().indexOf({name: items[0]}) < 0){
        this.getFormatChips().push({name: items[0]});
      }
    }
  };

  this.typeChips = [];
  this.typeSearchText = "";
  this.typeSelected = null;
  this.getTypeChips = function(){ return this.typeChips; };
  this.typeQuerySearch = function(){
    return GameTypeFactory.getTypes().filter((function filterFn(item){
      return (item.toLowerCase().indexOf(this.typeSearchText.toLowerCase()) >= 0);
    }).bind(this))
  };
  this.addTypeChip = function(){
    var items = this.typeQuerySearch();
    if(items.length > 0){
      if(this.getTypeChips().indexOf({name: items[0]}) < 0){
        this.getTypeChips().push({name: items[0]});
      }
    }
  };

  this.getGames = function(){
    var games = LobbyGamesService.getGames().slice(0);;

    for(var i=0; i<LobbyGamesService.getGames().length; i++){
      var game = LobbyGamesService.getGames()[i];

      var hasFormat = false;
      for(var j=0; j<this.getFormatChips().length; j++){
        var chip = this.getFormatChips()[j];
        if(chip.name === GameFormatFactory.getFormatText(game.config.formatId)){
          hasFormat = true;
          break;
        }
      }

      var hasType = false;
      for(var j=0; j<this.getTypeChips().length; j++){
        var chip = this.getTypeChips()[j];
        if(chip.name === GameTypeFactory.getTypeText(game.config.typeId)){
          hasType = true;
          break;
        }
      }
      if((this.getFormatChips().length > 0 && !hasFormat) || (this.getTypeChips().length > 0 && !hasType)){
        games.splice(games.indexOf(game), 1);
      }
    }

    return games;
  };
});
