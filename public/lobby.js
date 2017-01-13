'use strict';

WebApp.controller("LobbyController", function($rootScope, $scope, $timeout, $interval, $http, Fullscreen, $mdDialog, socketLobby, $q){
  $scope.LobbyChat = {
    _toggle: true,
    onToggle: function(){
      this._toggle = !this._toggle;
    },
    isOpen: function(){
      return this._toggle;
    },
    getToolbarClass: function(){
      return (this._toggle ? 'lobbychat-toolbar-opened' : 'lobbychat-toolbar-closed');
    },
    getClass: function(){
      return (this._toggle ? 'lobbychat-opened' : 'lobbychat-closed');
    },
    users: [],
    messages: [],
    messageText: "",
    getUsers: function(){
      var users = [];
      for(var i=0; i<this.users.length; i++){
        var user = $rootScope.getUser(this.users[i].username);
        users.push(user);
      }
      return users;
    }
  };
  $scope.Game = {
    type: {
      Teams: 0,
      FFA: 1,
      toString: function(id){
        return (id == 0 ? "Teams" : (id == 1 ? "FFA" : ""));
      }
    },
    format: {
      Standard: 0,
      Modern: 1,
      Commander: 2,
      Legacy: 3,
      toString: function(id){
        return (id == 0 ? "Standard" : (id == 1 ? "Modern" : (id == 2 ? "Commander" : (id == 3 ? "Legacy" : ""))));
      }
    },
    playerCount: {
      toString: function(count, type){
        return (type == 0 ? count + "v" + count : (type == 1 ? count + " Players" : ""));
      }
    }
  };
  $scope.GameSearch = {
    searchText: "",
    showFilter: true,
    toggleFilter: function(){
      this.showFilter = !this.showFilter;
    },
    filters: {
      transformChip: function(chip){
        if(angular.isObject(chip)) return chip;
        return {name: chip};
      },
      format: {
        names: [{name: "Standard"}, {name: "Modern"}, {name: "Commander"}, {name: "Legacy"}],
        chips: [],
        selected: null,
        searchText: "",
        querySearch: function(){
          return this.names.filter(function filterFn(item){return ((item.name).toLowerCase().indexOf($scope.GameSearch.filters.format.searchText.toLowerCase()) >= 0);});
        },
        addChip: function(){
          var items = this.querySearch(this.searchText);
          if(items.length > 0){
            if(this.chips.indexOf(items[0]) < 0){
              this.chips.push(items[0]);
            }
          }
        }
      },
      type: {
        names: [{name: "Teams"}, {name: "FFA"}],
        chips: [],
        selected: null,
        searchText: "",
        querySearch: function(){
          return this.names.filter(function filterFn(item){return ((item.name).toLowerCase().indexOf($scope.GameSearch.filters.type.searchText.toLowerCase()) >= 0);});
        },
        addChip: function(){
          var items = this.querySearch(this.searchText);
          if(items.length > 0){
            if(this.chips.indexOf(items[0]) < 0){
              this.chips.push(items[0]);
            }
          }
        }
      }
    }
  };
  $scope.LobbyList = [{
    title: "Ninth's game",
    isLocked: true,
    config: {
      typeId: 0,
      typeCount: 8,
      formatId: 1
    },
    game: {
      isRunning: false
    }
  },
  {
    title: "buttercup",
    isLocked: false,
    config: {
      typeId: 0,
      typeCount: 2,
      formatId: 2
    },
    game: {
      isRunning: false
    }
  },
  {
    title: "potato",
    isLocked: true,
    config: {
      typeId: 1,
      typeCount: 1,
      formatId: 0
    },
    game: {
      isRunning: true
    }
  },
  {
    title: "WHATS LOVE GOT TO DO GOT TO DO WITH THIS",
    isLocked: true,
    config: {
      typeId: 0,
      typeCount: 2,
      formatId: 3
    },
    game: {
      isRunning: false
    }
  },
  {
    title: "...ooo000 [[XxX Game]] 000ooo...",
    isLocked: false,
    config: {
      typeId: 0,
      typeCount: 1,
      formatId: 2
    },
    game: {
      isRunning: false
    }
  },
  {
    title: "YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYyyyyyyyyyyyyyyyyyyyyyYYYYYYYYYYYYYYYYYYYYYYYYY",
    isLocked: false,
    config: {
      typeId: 1,
      typeCount: 5,
      formatId: 0
    },
    game: {
      isRunning: true
    }
  },
  {
    title: "Magic Card Game Commander style",
    isLocked: true,
    config: {
      typeId: 1,
      typeCount: 4,
      formatId: 2
    },
    game: {
      isRunning: true
    }
  }];
  $scope.FilterLobby = function(){
    // var lobby = [];
    // if($scope.GameSearch.filters.format.chips.length <= 0 && $scope.GameSearch.filters.type.chips.length <=0) return $scope.LobbyList;
    // for(var i=0; i<$scope.LobbyList.length; i++){
    //   var game = $scope.LobbyList[i];
    //   for(var j=0; j<$scope.GameSearch.filters.format.chips.length; j++){
    //     var chip = $scope.GameSearch.filters.format.chips[j];
    //     if(chip.name === $scope.Game.format.toString(game.config.formatId)){
    //       lobby.push(game);
    //       break;
    //     }
    //   }
    //   for(var j=0; j<$scope.GameSearch.filters.type.chips.length; j++){
    //     var chip = $scope.GameSearch.filters.type.chips[j];
    //     if(chip.name === $scope.Game.type.toString(game.config.typeId)){
    //       lobby.push(game);
    //       break;
    //     }
    //   }
    // }
    var lobby = $scope.LobbyList.slice(0);
    for(var i=0; i<$scope.LobbyList.length; i++){
      var game = $scope.LobbyList[i];

      var hasFormat = false;
      for(var j=0; j<$scope.GameSearch.filters.format.chips.length; j++){
        var chip = $scope.GameSearch.filters.format.chips[j];
        if(chip.name === $scope.Game.format.toString(game.config.formatId)){
          hasFormat = true;
          break;
        }
      }
      
      var hasType = false;
      for(var j=0; j<$scope.GameSearch.filters.type.chips.length; j++){
        var chip = $scope.GameSearch.filters.type.chips[j];
        if(chip.name === $scope.Game.type.toString(game.config.typeId)){
          hasType = true;
          break;
        }
      }
      if(($scope.GameSearch.filters.format.chips.length > 0 && !hasFormat) || ($scope.GameSearch.filters.type.chips.length > 0 && !hasType)){
        lobby.splice(lobby.indexOf(game), 1);
      }
    }

    return lobby;
  };

  socketLobby.on("connect", function(){
    socketLobby.on("lobby.chat.users", function(data){
      $scope.LobbyChat.users = [];
      for(var i=0; i<data.length; i++){
        $scope.LobbyChat.users.push({username: data[i].username});
        $rootScope.setUser(data[i].username, data[i].statusId);
      }
      // $scope.LobbyChat.users = data;
    });

    socketLobby.on("lobby.chat.message", function(data){
      $scope.LobbyChat.messages.push(data);

      $timeout(function(){
        var container = document.getElementsByClassName("lobbychat-chatbox-display")[0];
        var containerHeight = container.clientHeight;
        var contentHeight = container.scrollHeight;
        container.scrollTop = contentHeight - containerHeight;
      }, 100);
    });
  });

  $scope.onSendLobbyChatMessage = function(message){
    if(message != null && !( /^[\s]*$/.test(message) )){
      socketLobby.emit("lobby.chat.sendMessage", {text: message});
      $scope.LobbyChat.messageText = "";
    }
  };

  var originatorEv;
  $scope.openMenu = function($mdOpenMenu, ev){
    originatorEv = ev;
    $mdOpenMenu(ev);
  };
});

WebApp.factory("socketLobby", function($rootScope){
  var socket = io("/lobby", { transports: ['websocket'] });
  return {
    on: function(eventName, callback){
      socket.on(eventName, function(){
        var args = arguments;
        $rootScope.$apply(function(){
          callback.apply(socket, args);
        });
      });
    },
    emit: function(eventName, data, callback){
      socket.emit(eventName, data, function(){
        var args = arguments;
        $rootScope.$apply(function(){
          if(callback){
            callback.apply(socket, args);
          }
        });
      });
    }
  };
});

// WebApp.filter("filterGameList", function($filter){
//   return function(list, arrayFilter, element){
//     if(arrayFilter){
//       return $filter("filter")(list, function(listItem){
//         return arrayFilter.indexOf(listItem[element]) != -1;
//       });
//     }
//   };
// });
