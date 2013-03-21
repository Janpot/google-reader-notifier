'use strict';


angular.module('Reader.optionsPage', ['Reader.services.options', 'Reader.directives']);


function OptionsCtrl($scope, options) {

  $scope.syncEnabled = options.isSyncEnabled;
  $scope.options = options.get();

  $scope.$watch('options', function(newValue, oldValue) {
    options.set($scope.options);
  }, true);

  $scope.enableSync = function ($event) {
    options.enableSync($event.target.checked);
  };

  $scope.refreshIntervals = [
    {
      value: 1,
      i18nSuffix: '1Minute'
    }, {
      value: 5,
      i18nSuffix: '5Minutes'
    }, {
      value: 10,
      i18nSuffix: '10Minutes'
    }, {
      value: 15,
      i18nSuffix: '15Minutes'
    }, {
      value: 30,
      i18nSuffix: '30Minutes'
    }, {
      value: 60,
      i18nSuffix: '1Hour'
    }, {
      value: 240,
      i18nSuffix: '4Hours'
    }, {
      value: 480,
      i18nSuffix: '8Hours'
    }
  ].map(function (option) {
    return {
      value: option.value,
      description:  chrome.i18n.getMessage('options_behavior_' + option.i18nSuffix)
    }
  });

}