angular.module('Reader.filters', [])

  .filter('conditional', function() {
    return function(condition, ifTrue, ifFalse) {
      return condition ? ifTrue : ifFalse;
    };
  });