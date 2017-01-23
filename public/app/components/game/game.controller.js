'use strict';

App.controller("GameController", function(GameSocketService, GameSidebarService, GameToolbarService, GameChatService, GameUsersService, GameConfigService, GameService, $mdDialog, $element){
  this.socketService = GameSocketService;
  this.sidebarService = GameSidebarService;
  this.toolbarService = GameToolbarService;
  this.chatService = GameChatService;
  this.usersService = GameUsersService;
  this.configService = GameConfigService;
  this.service = GameService;
  
  this.color = ["blue", "blue", "red", "red"];
  this.mtgCardRatio = 0.7;
  this.cardRatio = 0.25;
  this.getMinSize = function(id){
    var element = document.getElementById("gc-container-"+id);
    if(element != null) return (element.offsetWidth > element.offsetHeight ? element.offsetHeight : element.offsetWidth);
    return 1;
  };

  this.teams = [{name: 'Team 1', value: 1}, {name: 'Team 2', value: 2}];

  this.showLeaveGameConfirmDialog = function(ev){
    $mdDialog.show(
        $mdDialog.confirm()
          .title("Confirm")
          .textContent("Are you sure you want to leave the game?")
          .targetEvent(ev)
          .ok("Leave")
          .cancel("Cancel")
      ).then(function(){
        // Confirmed
        GameSocketService.onLeaveGame();
      }, function(){
        // Cancelled
      });
  };

  this.showGameSettingsDialog = function(ev){
    $mdDialog.show({
      controller: "GameSettingsDialogController",
      templateUrl: "./assets/html/game/gamesettings.dialog.html",
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true,
      locals: {
        $game: this,
      }
    });
  };

  this.showSelectDeckDialog = function(ev){
    $mdDialog.show({
      controller: "SelectDeckDialogController",
      templateUrl: "./assets/html/game/selectdeck.dialog.html",
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true,
      locals: {
        $game: this,
      }
    });
  };
});

App.controller("GameSettingsDialogController", function($scope, $mdDialog, $game, UserService, GameFormatFactory, GameTypeFactory){
  $scope.game = $game;
  $scope.userService = UserService;
  $scope.gameFormatFactory = GameFormatFactory;
  $scope.gameTypeFactory = GameTypeFactory;

  $scope.title = $game.configService.getTitle();
  $scope.isLocked = $game.configService.isLocked();
  $scope.password = "";
  $scope.formatId = $game.configService.getFormatId();
  $scope.typeId = $game.configService.getTypeId();
  $scope.typeCount = $game.configService.getTypeCount();
  $scope.playerCounts = [
    [{name: "1v1", value: 1},{name: "2v2", value: 2},{name: "3v3", value: 3}],
    [{name: "3 FFA", value: 3},{name: "4 FFA", value: 4},{name: "5 FFA", value: 5}]
  ];

  $scope.onSaveSettings = function(){
    $game.socketService.onSaveSettings({
      title: $scope.title, 
      isLocked: $scope.isLocked,
      password: $scope.password,
      config: {
        formatId: $scope.formatId,
        typeId: $scope.typeId,
        typeCount: $scope.typeCount
      }
    });
  };

  $scope.onDeleteGame = function(){
    $mdDialog.show(
      $mdDialog.confirm()
        .title("Confirm")
        .textContent("Are you sure you want to delete the game?")
        .ok("Delete")
        .cancel("Cancel")
    ).then(function(){
      // Confirmed
      $game.socketService.onDeleteGame();
    }, function(){
      // Cancelled
    });
  };

  $scope.hide = function() {
    $mdDialog.hide();
  };

  $scope.cancel = function() {
    $mdDialog.cancel();
  };

  $scope.answer = function(answer) {
    $mdDialog.hide(answer);
  };
});

App.controller("SelectDeckDialogController", function($scope, $mdDialog, $game){
  $scope.game = $game;
  
  $scope.hide = function() {
    $mdDialog.hide();
  };

  $scope.cancel = function() {
    $mdDialog.cancel();
  };

  $scope.answer = function(answer) {
    $mdDialog.hide(answer);
  };
});