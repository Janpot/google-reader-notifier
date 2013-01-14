angular.module('Reader.directives', [])
  
  .directive('whenScrolled', function() {
    return function(scope, elm, attr) {
      var raw = elm[0];
      var hasMoreElements = true;
      
      elm.bind('scroll', function() {
        if (!hasMoreElements) {
          return;
        }
        if (raw.scrollTop + raw.offsetHeight + 200 >= raw.scrollHeight) {
          hasMoreElements = scope.$apply(attr.whenScrolled);
        }
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
  
  .directive('middleClick', function($parse) {
    return {
      restrict: 'A',
      link: function(scope, element, attr) {
        var fn = $parse(attr.middleClick);
        element.bind('click', function(event) {
          var clickedMiddle = (event.button === 1) || (event.button === 0 && event.ctrlKey);
          if (clickedMiddle) {
            scope.$apply(function() {
              fn(scope, {$event: event});
            }); 
          }
        });
      }
    };
  })
  
 .directive('scrollNice', function($parse) {
    
    return {
      restrict: 'A',
      link: function(scope, element, attr) {
        var scrollItems = function (n) {
          var items = element[0].querySelectorAll(attr.scrollNice);
          
          var scrollTop = element[0].scrollTop;
          var parentOffsetTop = element[0].offsetTop;
          
          // find the first visible item
          var firstItemViewportTop = -1000000;
          var firstVisibleItemIdx = 0;
          
          for (var i = 0; i < items.length; i++) {
            var item = items.item(i);
            var itemTop = item.offsetTop - parentOffsetTop;
            
            var viewportTop = itemTop - scrollTop;
            if (viewportTop <= 0 && viewportTop > firstItemViewportTop) {
              firstVisibleItemIdx = i;
            }
            
          }
          // get the next item
          nextIndex = Math.max(Math.min(firstVisibleItemIdx - n, items.length), 0);
          var topElement = items.item(nextIndex);
          // scroll to position
          element[0].scrollTop = topElement.offsetTop - parentOffsetTop;
        };
        
        element.bind('mousewheel', function(event) {          
          var amount = Math.round(event.wheelDeltaY / 120);
          scrollItems(amount);
          event.preventDefault();
        });
      }
    };
  })