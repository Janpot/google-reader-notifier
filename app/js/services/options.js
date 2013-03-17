angular.module('Reader.services.options', [])
  .factory('options', function($rootScope, $q) {
  
    var controllerObj = {};
  
    options.onChange(function (changes) {
      $rootScope.$apply(function () {
        for (var property in changes) {
          controllerObj[property] = changes[property].newValue;
        }
      });
    });
  
    return {
      get: function (callback) {
        options.get(function (values) {
          $rootScope.$apply(function () {
            angular.copy(values, controllerObj);
            if (callback instanceof Function) {
              callback(controllerObj);
            }
          });
        });
        return controllerObj;
      },
  
      set: function (values) {
        options.set(values);
      },
  
      enableSync: options.enableSync,
  
      isSyncEnabled: options.isSyncEnabled
    };
  });