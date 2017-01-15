'use strict';

App.controller("MainController", function(Fullscreen, UserService, UsersService, StatusFactory, SocketService, $mdDialog, $window, GameFormatFactory, GameTypeFactory){
  this.fullscreenService = Fullscreen;
  this.userService = UserService;
  this.usersService = UsersService;
  this.socketService = SocketService;
  this.statusFactory = StatusFactory;
  this.gameFormatFactory = GameFormatFactory;
  this.gameTypeFactory = GameTypeFactory;

  this.showFriendsDialog = function(ev){
    $mdDialog.show({
      controller: "FriendsDialogController",
      templateUrl: "./assets/html/friends/friends.dialog.html",
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true,
      locals: {
        $main: this
      }
    });
  };

  this.showAddFriendDialog = function(ev){
    $mdDialog.show({
      controller: "AddFriendDialogController",
      templateUrl: "./assets/html/friends/addfriend.dialog.html",
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true,
      locals: {
        $main: this
      }
    });
  };

  this.showRemoveFriendConfirmDialog = function(ev, friendName){
    $mdDialog.show(
        $mdDialog.confirm()
          .title("Confirm")
          .textContent("Are you sure you want to remove " + friendName + " from your friends?")
          .targetEvent(ev)
          .ok("Remove")
          .cancel("Cancel")
      ).then(function(){
        // Confirmed
        SocketService.onRemoveFriend(friendName);
      }, function(){
        // Cancelled
      });
  };

  this.showGamePasswordPrompt = function(ev, gameId){
    $mdDialog.show(
      $mdDialog.prompt()
        .title("Password Required")
        .textContent("")
        .placeholder("Password")
        .initialValue("")
        .targetEvent(ev)
        .ok("Ok")
        .cancel("Cancel")
    ).then(function(password){
      // Ok
      $window.location.href = "/game?gid=" + gameId + "&password=" + password;
    }, function(){
      // Cancelled
    });
  };

  this.showCreateNewGameDialog = function(ev){
    $mdDialog.show({
      controller: "CreateGameDialogController",
      templateUrl: "./assets/html/game/creategame.dialog.html",
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true,
      locals: {
        $main: this
      }
    });
  };

  this.onJoinGame = function(ev, gameId, isLocked){
    if(isLocked){
      this.showGamePasswordPrompt(ev, gameId);
    }else{
      $window.location.href = "/game?gid=" + gameId;
    }
  };

  var originatorEv;
  this.openMenu = function($mdOpenMenu, ev){
    originatorEv = ev;
    $mdOpenMenu(ev);
  };
});

App.controller("CreateGameDialogController", function($scope, $mdDialog, $main){
  $scope.main = $main;
  $scope.isLocked = false;
  $scope.playerCounts = [
    [{name: "1v1", value: 1},{name: "2v2", value: 2},{name: "3v3", value: 3}],
    [{name: "3 FFA", value: 3},{name: "4 FFA", value: 4},{name: "5 FFA", value: 5}]
  ];

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
