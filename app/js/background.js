var notificationOpen = false;

var notify = function () {
  if (notificationOpen) {
    return;
  }
  
  options.get(function (values) {
    if (values.showNotification) {      
      var notification = webkitNotifications.createNotification(
        '',
        'New items',
        'There are new items in your reading list'
      );
      
      var closeTimer = setTimeout(function () {
        notification.close();
      }, 10000);
      
      notification.onclose = function () {
        notificationOpen = false;
        clearTimeout(closeTimer);
      };
      
      notification.onclick = function () {
        notification.close();
        clearTimeout(closeTimer);
      };
      
      notification.show();
      notificationOpen = true;
    }
  });
};

var setExtensionUnreadCount = function (oldCount, newCount) {
  browserAction.setUnreadCount(newCount);
  
  if (newCount > oldCount) {    
    notify();
  }

};

poller.onUnreadCountChanged.subscribe(setExtensionUnreadCount);




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
  setClickBehaviour(values.clickBehaviour);
  
  // kick off polling with the configured interval
  poller.refresh(values.updateInterval);
});

options.onChange(function (changes) {

  if (changes.updateInterval) {
    poller.refresh(changes.updateInterval.newValue);
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
        poller.refresh();
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
  poller.refresh();
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

