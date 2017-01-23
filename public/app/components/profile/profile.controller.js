'use strict';

App.controller("ProfileDialogController", function($scope, $mdDialog, $main, $username){
  $scope.main = $main;
  $scope.username = $username
  
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