'use strict';

App.factory("StatusFactory", function(){
  var _data = ["Offline", "Online", "Away", "Busy", "Invisible"];
  return {
    getStatusText: function(statusId){
      if(statusId > -1 && statusId < _data.length) return _data[statusId];
      return "";
    },
    getStatusId: function(statusText){
      for(var i=0; i<_data.length; i++){
        if(statusText.toLowerCase() == _data[i].toLowerCase()) return i;
      }
      return -1;
    },
    getClass: function(statusId){
      return "status-icon-" + this.getStatusText(statusId).toLowerCase();
    }
  };
});

App.factory("GameFormatFactory", function(){
  var _data = ["Standard", "Modern", "Commander", "Legacy"];
  return {
    getFormatText: function(formatId){
      if(formatId > -1 && formatId < _data.length) return _data[formatId];
      return "";
    },
    getFormatId: function(formatText){
      for(var i=0; i<_data.length; i++){
        if(formatText.toLowerCase() == _data[i].toLowerCase()) return i;
      }
      return -1;
    },
    getFormats: function(){ return _data; }
  };
});


App.factory("GameTypeFactory", function(){
  var _data = ["Teams", "FFA"];
  return {
    getTypeText: function(typeId){
      if(typeId > -1 && typeId < _data.length) return _data[typeId];
      return "";
    },
    getTypeId: function(typeText){
      for(var i=0; i<_data.length; i++){
        if(typeText.toLowerCase() == _data[i].toLowerCase()) return i;
      }
      return -1;
    },
    getTypes: function(){ return _data; },
    getPlayerCountText: function(count, typeId){
      return (typeId == 0 ? count + "v" + count : count + " Players");
    }
  };
});

App.factory("SocketFactory", function($rootScope){
  var socket = io("/", { transports: ['websocket'] });
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

App.factory("LobbySocketFactory", function($rootScope){
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

App.factory("GameSocketFactory", function($rootScope, $location){
  var socket = io("/game", { transports: ['websocket'], query: {gid: getUrlParameter("gid") }});
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

function getUrlParameter(param, dummyPath) {
  var sPageURL = dummyPath || window.location.search.substring(1),
      sURLVariables = sPageURL.split(/[&||?]/),
      res;

  for (var i = 0; i < sURLVariables.length; i += 1) {
      var paramName = sURLVariables[i],
          sParameterName = (paramName || '').split('=');

      if (sParameterName[0] === param) {
          res = sParameterName[1];
      }
  }

  return res;
}
