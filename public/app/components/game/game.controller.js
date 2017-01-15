'use strict';

App.controller("GameController", function(GameSocketService, GameSidebarService, GameToolbarService, GameChatService, GameUsersService, GameConfigService){
  this.socketService = GameSocketService;
  this.sidebarService = GameSidebarService;
  this.toolbarService = GameToolbarService;
  this.chatService = GameChatService;
  this.usersService = GameUsersService;
  this.configService = GameConfigService;
});
