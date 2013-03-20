angular.module('Reader.directives', [])


  .directive('onMousewheel', function($parse) {
    return function(scope, elm, attr) {
      var fn = $parse(attr.onMousewheel);
      elm.bind('mousewheel', function (event) {
        scope.$apply(function() {
          return fn(scope, {
            deltaX: event.originalEvent.wheelDeltaX / 120, 
            deltaY: event.originalEvent.wheelDeltaY / 120, 
            $event: event
          });
        });
      });
    };
  })

  .directive('repeatingClick', function($parse, $timeout) {
    var WAIT_TIME = 750;
    var REPEAT_TIME = 100;
    
    return function(scope, elm, attr) {
      var timer = null;
      var fn = $parse(attr.repeatingClick);
      var event = null;
      
      var fireEvent = function () {
        return fn(scope, {
          $event: event
        });
      };
      
      var repeat = function () {
        timer = $timeout(function() {
          fireEvent();
          repeat();
        }, REPEAT_TIME);        
      };
      
      elm.bind('mousedown', function (e) {
        event = e;
        scope.$apply(fireEvent);
        
        timer = $timeout(repeat, WAIT_TIME);
      });
      
      angular.element(document.body).bind('mouseup mouseleave', function () {
        $timeout.cancel(timer);
      });
    };
  })

  .directive('a', function() {
    var openUrl = function (url, background) {
      var tab = {url: url};

      if(background) {
        tab.selected =  false;
      }

      chrome.tabs.create(tab);
    };

    return {
      restrict: 'E',
      link: function(scope, elm, attr) {
        elm.bind('click', function(event) {
          if (attr.href) {
            var clickedMiddle = (event.button === 1) || (event.button === 0 && event.ctrlKey);
            openUrl(attr.href, clickedMiddle);
            event.preventDefault();
          }
        });
      }
    };
  })

  .directive('bindCompileHtml', function($sanitize, $compile) {
    return {
      scope: true,
      link: function(scope, element, attr) {
        element.addClass('ng-binding').data('$binding', attr.bindCompileHtml);
        scope.$watch(attr.bindCompileHtml, function bindCompileHtml(value) {
          value = $sanitize(value);
          element.html(value || '');
          // compile the content so anchor elements behave properly
          $compile(element.contents())(scope);
        });
      }
    };
  })

  .directive('resetScroll', function() {
    return function(scope, element, attr) {
      scope.$watch(attr.resetScroll, function (value) {
        element[0].scrollTop = 0;
      });
    };
  })

  .directive('leftClick', function($parse) {
    return {
      restrict: 'A',
      link: function(scope, element, attr) {
        var fn = $parse(attr.leftClick);
        element.bind('click', function(event) {
          var clickedLeft = event.button === 0;
          if (clickedLeft) {
            scope.$apply(function() {
              return fn(scope, {$event: event});
            });
            event.stopPropagation();
          }
        });
      }
    };
  })

  .directive('middleClick', function($parse) {
    return {
      restrict: 'A',
      link: function(scope, element, attr) {
        var fn = $parse(attr.middleClick);
        element.bind('click', function(event) {
          var clickedMiddle = (event.button === 1) || (event.button === 0 && event.ctrlKey);
          if (clickedMiddle) {
            scope.$apply(function() {
              return fn(scope, {$event: event});
            });
            event.stopPropagation();
          }
        });
      }
    };
  })

 

  .directive('i18nContent', function($compile) {
    return {
      restrict: 'A',
      controller: function ($scope) {
        var substitutes = [];
        this.addSubstitute = function (index, content) {
          console.assert(index >= 0 && index < 9, 'invalid substitute index')
          substitutes[index] = content;
        }
        this.getSubstitutes = function () {
          return substitutes;
        }
      },
      link: function (scope, element, attr, controller) {
        var message = chrome.i18n.getMessage(attr.i18nContent, controller.getSubstitutes());
        element.html(message || '');
        $compile(element.contents())(scope);
      }
    };
  })

  .directive('i18nSubstitute', function() {
    return {
      restrict: 'M',
      require: '^i18nContent',
      link: function (scope, element, attr, i18nContent) {
        var match = attr.i18nSubstitute.match(/^\$([1-9]):(.*)$/);
        if (match) {
          i18nContent.addSubstitute(parseInt(match[1]) - 1, match[2]);
        }
      }
    };
  })