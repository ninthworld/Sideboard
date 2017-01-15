'use strict';

App.service("AddFriendDialogService", function(){
  var _users = [];

  this.searchText = "";
  this.getUsers = function(){ return _users; };
  this.setUsers = function(users){ _users = users; };
});
