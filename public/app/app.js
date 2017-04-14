'use strict';

var App = angular.module("App", ['ngMaterial', 'ngAnimate', 'FBAngular', 'as.sortable']);

App.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});
