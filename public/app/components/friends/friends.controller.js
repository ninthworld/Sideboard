'use strict';

App.controller("FriendsDialogController", function($scope, $mdDialog, $main){
  $scope.main = $main;
  
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

App.controller("AddFriendDialogController", function($scope, $mdDialog, $main, AddFriendDialogService){
  $scope.main = $main;
  $scope.service = AddFriendDialogService;

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
