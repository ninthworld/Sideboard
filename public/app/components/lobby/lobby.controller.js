'use strict';

App.controller("LobbyController", function(LobbySidebarService, LobbyGamesService, LobbySocketService, LobbyChatService, LobbyToolbarService, LobbyUsersService, LobbySearchService, LobbyFilterService, GameFormatFactory, GameTypeFactory){
  this.socketService = LobbySocketService;
  this.gamesService = LobbyGamesService;
  this.sidebarService = LobbySidebarService;
  this.toolbarService = LobbyToolbarService;
  this.usersService = LobbyUsersService;
  this.chatService = LobbyChatService;
  this.searchService = LobbySearchService;
  this.filterService = LobbyFilterService;
  this.gameFormatFactory = GameFormatFactory;
  this.gameTypeFactory = GameTypeFactory;
});
