var Event = function () {
  this.listeners = [];
};

Event.prototype.subscribe = function (listener) {
  this.listeners.push(listener);
};

Event.prototype.unSubscribe = function (toRemove) {
  this.listeners = this.listeners.filter(function (listener) {
    return listener !== toRemove;
  });
};

var Emitter = function () {
  this.event = new Event();
};

Emitter.prototype.fire = function (scope) {
  var args = arguments.splice(1);
  this.event.listeners.forEach(function (listener) {
    listener.apply(scope || window, args);
  });
};

var poller = (function () {
  
  var unreadCount = 0;
  var refeshTimer = null;  
  var readingListMatcher = /user\/[\\d]+\/state\/com.google\/reading-list/;
  
  var unreadCountChange = new Emitter();
  
  var onUnreadCountUpdated = function (count) {
    if (count !== unreadCount) {
      unreadCountChange.fire(window, unreadCount, count);
      unreadCount = count;
    }
  };
  
  var onReadingListReceived = function (readingList) {
    // search through all unreadcounts for the reading list.
    for (var i = 0; i < readingList.unreadcounts.length; i++) {
      if (readingListMatcher.test(readingList.unreadcounts[i].id)) {
        onUnreadCountUpdated(readingList.unreadcounts[i].count);
        return;
      }
    }
  };
  
  var getUnreadCount = function (onSuccess, onError) {
    return http.getJson('https://www.google.com/reader/api/0/unread-count', {
      params: {
        output: 'json',
        ck: Date.now(),
        client: 'notifier'
      }
    }, onSuccess, onError)
  };
  
  var refresh = function () {
    console.log('refereshing...');
    getUnreadCount(onReadingListReceived, function onError() {
      console.error('error getting unread count');
    });
  };
  
  var setUpdateInterval = function (interval) {
    var period = interval * 60 *1000; // minutes to ms
    clearInterval(refeshTimer);    
    refeshTimer = setInterval(refresh, period);
    refresh()
  };
  
  setUpdateInterval(5);
  
  return {
    setUpdateInterval: setUpdateInterval,
    onUnreadCountChanged: unreadCountChange.event
  };
  
}());


var getUnreadCount = function (onSuccess, onError) {
  return http.getJson('https://www.google.com/reader/api/0/unread-count', {
    params: {
      output: 'json',
      ck: Date.now(),
      client: 'notifier'
    }
  }, onSuccess, onError)
};
  

var makeTagComparer = function (tag) {
  var matcher = new RegExp('user/[\\d]+/state/com.google/' + tag);
  return function (string) {
    return matcher.test(string);
  };      
};

var refreshUnreadCount = function () {
  console.log('refereshing...');
  var handleSuccess = function (response) {
    // make a function to check whether a certain string represents the tag 'reading-list'.
    var isReadingList = makeTagComparer('reading-list');

    var found = false;
    // search through all unreadcounts for the reading list.

    for (var i = 0; i < response.unreadcounts.length; i++) {
      found = isReadingList(response.unreadcounts[i].id)
      if (found) {

        setExtensionUnreadCount(response.unreadcounts[i].count);
        break;
      }
    }

    if (!found) {
      setExtensionUnreadCount(0);
    }
  };

  getUnreadCount(handleSuccess, function onError() {
    console.error('error getting unread count');
  });
};

var prevCount = 0;
var notificationOpen = false;

var setExtensionUnreadCount = function (count) {
  browserAction.setUnreadCount(count);
  
  if (count > prevCount && !notificationOpen) {    
    notificationOpen = true;
    
    var notification = webkitNotifications.createNotification(
      '',
      'New items',
      'There are new items in your reading list'
    );
    notification.onclose = function () {
      notificationOpen = false;
    };
    
    notification.show();
    // var notification = webkitNotifications.createHTMLNotification('notification.html');
  }

  prevCount = count;

};

var updateIntervalId;

var setUpdateInterval = function (interval) {
  console.log('interval is now ' + interval + ' minutes');
  if (updateIntervalId) {
    clearInterval(updateIntervalId)
  }
  var period = interval * 60 *1000; // minutes to ms
  updateIntervalId = setInterval(refreshUnreadCount, period);
  refreshUnreadCount();
};

var parseColor = function (hex) {
  var match = /^#([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])$/.exec(hex);
  if (match) {
    return [
      parseInt(match[1] + match[1], 16),
      parseInt(match[2] + match[2], 16),
      parseInt(match[3] + match[3], 16),
      255
    ];
  } else {
    match = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex);
    if (match) {
      return [
        parseInt(match[1], 16),
        parseInt(match[2], 16),
        parseInt(match[3], 16),
        255
      ];
    }
  }
  return;
};

options.get(function (values) {
  var unreadColor = parseColor(values.colorUnread);
  browserAction.setUnreadColor(unreadColor);
  var noUnreadColor = parseColor(values.colorNoUnread);
  browserAction.setNoUnreadColor(noUnreadColor);
  browserAction.setDoAnimation(values.doAnimation);
  setUpdateInterval(values.updateInterval);
  setClickBehaviour(values.clickBehaviour);
});

options.onChange(function (changes) {
  console.log(changes);
  if (changes.updateInterval) {
    setUpdateInterval(changes.updateInterval.newValue);
  }

  if (changes.colorUnread) {
    var unreadColor = parseColor(changes.colorUnread.newValue);
    if (unreadColor) {
      browserAction.setUnreadColor(unreadColor);
      browserAction.previewColor(unreadColor);
    }
  }

  if (changes.colorNoUnread) {
    var noUnreadColor = parseColor(changes.colorNoUnread.newValue);
    if (noUnreadColor) {
      browserAction.setNoUnreadColor(noUnreadColor);
      browserAction.previewColor(noUnreadColor);
    }
  }

  if (changes.doAnimation) {
    browserAction.setDoAnimation(changes.doAnimation.newValue);
  }

  if (changes.clickBehaviour) {
    setClickBehaviour(changes.clickBehaviour.newValue);
  }
});


chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(request.method === 'updateUnreadCount') {
      console.log('update request received', request);
      if(request.count) {
        setExtensionUnreadCount(request.count);
      } else {
        refreshUnreadCount();
      }
    }
    sendResponse({});
  });




function getReaderTab(callback) {
  chrome.tabs.getAllInWindow(undefined, function(tabs) {
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      if (tab.url && /https?\:\/\/www.google.com\/reader\/view\//.test(tab.url)) {
        callback(tab);
        return;
      }
    }

    callback(null);
  });
};

function onOpenReaderMouseClick() {
  refreshUnreadCount();
  getReaderTab(function(tab) {
    if (tab) {
      // Try to reuse an existing Reader tab
      chrome.tabs.update(tab.id, {selected: true});
    } else {
      chrome.tabs.create({url: 'https://www.google.com/reader/'});
    }
  });
};


// click behaviour

var setClickBehaviour = function (clickBehaviour) {
  if(clickBehaviour === options.clickBehaviours.openPopup) {
    chrome.browserAction.onClicked.removeListener(onOpenReaderMouseClick);
    chrome.browserAction.setPopup({ popup: 'popup.html' } );
  } else {
    chrome.browserAction.onClicked.addListener(onOpenReaderMouseClick);
    chrome.browserAction.setPopup({ popup: '' } );
  }
}




var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-18936219-1']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

