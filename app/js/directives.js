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
        elm.bind('click', function(e) {
          openUrl(attr.href, e.button === 1);
          e.preventDefault();
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
  