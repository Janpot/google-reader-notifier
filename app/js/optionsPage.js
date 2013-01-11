'use strict';


angular.module('Reader.optionsPage', ['Reader.services', 'Reader.directives']);


function OptionsCtrl($scope, options) {
    
    $scope.syncEnabled = options.isSyncEnabled;
    $scope.options = options.get();
    
    $scope.$watch('options', function(newValue, oldValue) {
      options.set($scope.options);
    }, true);
    
    $scope.$watch('cssColorNoUnread', function(newValue, oldValue) {
      console.log(newValue);
    });
    
    $scope.enableSync = function ($event) {
      options.enableSync($event.target.checked);
    };
    
    $scope.refreshIntervals = [
        {             
            value: 1,             
            description: '1 minute'         
        },
        {             
            value: 5,     
            description: '5 minutes'      
        },
        {   
            value: 10,       
            description: '10 minutes'       
        },
        {   
            value: 15,      
            description: '15 minutes'     
        },
        {   
            value: 30,     
            description: '30 minutes'    
        },
        {   
            value: 60,        
            description: '1 hour'      
        },
        {   
            value: 240,        
            description: '4 hours'      
        },
        {   
            value: 480,        
            description: '8 hours'      
        }
    ];

}