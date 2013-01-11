
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
    // make a function to check wether a certain string represents the tag 'reading-list'.
    var isReadingList = makeTagComparer('reading-list');

    var found = false;
    // search through all unreadcounts for the reading list.

    for (var i = 0; i < response.unreadcounts.length; i++) {
      found = isReadingList(response.unreadcounts[i].id)
      if (found) {
        
        browserAction.setUnreadCount(response.unreadcounts[i].count);
        break;
      }
    }
  
    if (!found) {
      browserAction.setUnreadCount(0);
    }
  };

  getUnreadCount(handleSuccess, function onError() {
    console.error('error getting unread count');
  });
};

var setUpdateInterval = function (interval) {
  console.log('interval is now ' + interval + ' minutes');
  chrome.alarms.create('refresh', { delayInMinutes : 0, periodInMinutes: interval }); 
};

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'refresh') {
    refreshUnreadCount();
  }
});

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
});


chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(request.method === 'updateUnreadCount') {
      console.log('update request received', request);
      if(request.count) {
        browserAction.setUnreadCount(request.count);
      } else {
        refreshUnreadCount();
      }
    }
    sendResponse({});
  });








