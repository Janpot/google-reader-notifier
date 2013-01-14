var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-18936219-1']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();


var analytics = (function () {
    
  return {
    
    views: {
      tab: 'tab',
      popup: 'popup'
    },
    
    itemViewedIn: function (item, where) {
      if (!item.read) {
        _gaq.push(['_trackEvent', 'Item', 'View', where]);
        // track 'view item in extension'
      }
    }
  
  };
  
}());
