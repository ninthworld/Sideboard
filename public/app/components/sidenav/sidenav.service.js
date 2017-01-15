'use strict';

App.service("SidenavService", function(){
  var _mouse = false;
  var _toggle = false;

  this.onToggle = function(){ _toggle = !_toggle; };
  this.onMouseEnter = function(){ _mouse = true; };
  this.onMouseLeave = function(){ _mouse = false; };

  this.isOpen = function(){ return (_mouse || _toggle); };
  this.getClass = function(){ return (this.isOpen() ? "navbar-opened" : "navbar-closed"); };
});

App.service("SidenavProfileService", function(SidenavService){
  var _toggle = false;

  this.onToggle = function(){ _toggle = !_toggle; };

  this.isOpen = function(){ return (_toggle && SidenavService.isOpen()); };
  this.getClass = function(){ return (this.isOpen() ? "avatar-profile-opened" : "avatar-profile-closed"); };
});

App.service("SidenavLogoService", function(SidenavService){
  this.isOpen = function(){ return SidenavService.isOpen(); };
  this.getClass = function(){ return (this.isOpen() ? "logo-opened" : "logo-closed"); };
});
