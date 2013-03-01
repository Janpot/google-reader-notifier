var Event = function () {
  this.listeners = [];
};

Event.prototype.subscribe = function (listener) {
  if (listener instanceof Function) {
    this.listeners.push(listener);
  } else {
    console.error('\'' + listener + '\' is not a function');
  }
};

Event.prototype.unSubscribe = function (toRemove) {
  this.listeners = this.listeners.filter(function (listener) {
    return listener !== toRemove;
  });
};

var Emitter = function () {
  this.event = new Event();
};

Emitter.prototype.fire = function (scope, args) {
  this.event.listeners.forEach(function (listener) {
    listener.apply(scope || window, args);
  });
};

var poller = (function () {
  
  var unreadCount = null;
  var refeshTimer = null;  
  var readingListMatcher = /user\/[\d]+\/state\/com\.google\/reading\-list/;
  
  var unreadCountChange = new Emitter();
  
  var onUnreadCountUpdated = function (count) {
    if (count !== unreadCount) {
      unreadCountChange.fire(window, [unreadCount, count]);
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
    
    // not in the list if we get here
    onUnreadCountUpdated(0)
  };
  
  var getUnreadCount = function (onSuccess, onError) {
    return http.getJson('https://www.google.com/reader/api/0/unread-count', {
      params: {
        output: 'json',
        ck: Date.now(),
        client: 'notifier'
      }
    }, onSuccess, onError);
  };
  
  var refreshInterval = 5; // minutes
  
  var refresh = function (interval) {    
    console.log('refereshing...');
    getUnreadCount(onReadingListReceived, function onError(msg) {
      console.error('error getting unread count: ' + msg);
    });
    
    refreshInterval = interval || refreshInterval;
    console.log('From now on: refreshing every ' + refreshInterval + ' minute(s)');
    var period = refreshInterval * 60 *1000; // minutes to ms
    clearInterval(refeshTimer);    
    refeshTimer = setInterval(refresh, period);
  };
  
  return {
    refresh: refresh,
    onUnreadCountChanged: unreadCountChange.event
  };
  
}());