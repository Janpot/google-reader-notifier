'use strict';

var services = angular.module('Reader.services', []);

services.factory('reader', function ($rootScope, $http, $q) {

  var normalize = function (str) {
    str = str || '';
    var subs = {
      'amp': '&',
      'apos': '\'',
      'quot': '\"',
      'lt': '<',
      'gt': '>'
    }
    return str.replace(/&([^;]+);/g, function (match, char) {
      if (subs[char]!== undefined) {
        return subs[char];
      } else {
        var asciiMatch = /^#(\d+)$/.exec(char);
        if (asciiMatch) {
          return String.fromCharCode(asciiMatch[1]);
        }
      }
      return match;
    });
  };

  var hasCategory = function (raw, categoryMatcher) {
    return raw.categories ? raw.categories.some(function matches(category) {
      return categoryMatcher.test(category);
    }) : false;
  }

  // provides a token to a function, retries once on fail
  var withToken = (function () {
    var token;

    var onRefreshSuccess = function (response) {
      token = response.data;
      return token;
    };

    var refreshToken = function () {
      var tokenUrl = 'https://www.google.com/reader/api/0/token';
      return $http.get(tokenUrl).then(onRefreshSuccess);
    };

    var ensureToken = function () {
      if(token === undefined) {
        return refreshToken();
      } else {
        return $q.when(token);
      }
    };

    return function (http) {
      var onHttpSuccess = function (value) {
        return value;
      };

      var retry = function (error) {
        return refreshToken().then(http);
      };

      return ensureToken().then(http).then(onHttpSuccess, retry);
    };
  }());

  var editTag = function (params) {
    var doEditTag = function (token) {
      params = params || {};
      params.output = 'json';
      params.T = token;
      var editTagUrl = 'https://www.google.com/reader/api/0/edit-tag';
      return $http.post(editTagUrl, '', { params: params });
    };

    return withToken(doEditTag);
  };

  var Item = function (raw) {
  // extract the content
    this.content = '';
    if (raw.content) {
      this.content = raw.content.content;
    } else if (raw.summary) {
      this.content = raw.summary.content;
    }

    // create a snippet
    var tmp = document.createElement('div');
    tmp.innerHTML = this.content.replace(/<img[^>]*>/g,'');
    this.snippet = tmp.textContent;

    // create a viewmodel
    this.title = raw.title ? normalize(raw.title) : '(title unknown)';

    this.url = ''
    if (raw.alternate && raw.alternate[0] && raw.alternate[0].href) {
      this.url = raw.alternate[0].href;
    }

    this.origin = raw.origin ? {
      title: raw.origin.title ? normalize(raw.origin.title) : undefined,
      url: raw.origin.htmlUrl
    } : undefined;

    this.author = raw.author;

    this.read = hasCategory(raw, /^user\/[-\d]+\/state\/com\.google\/read$/);
    this.starred = hasCategory(raw, /^user\/[-\d]+\/state\/com\.google\/starred$/);
    this.id = raw.id;

    if (raw.published) {
      this.time = new Date(raw.published * 1000);
    }

    this.keptUnread = hasCategory(raw, /^user\/[-\d]+\/state\/com\.google\/kept-unread$/);
    this.readStateLocked = raw.isReadStateLocked || false;
  };

  Item.prototype.markAsRead = function () {
    var readOld = this.read;
    var keptUnreadOld = this.keptUnread;
    this.read = true;
    this.keptUnread = false;
    self = this;
    editTag({
      i: this.id,
      a: 'user/-/state/com.google/read',
      r: 'user/-/state/com.google/kept-unread'
    }).then(function onSuccess() {
      chrome.extension.sendMessage({ method: "updateUnreadCount" });
    }, function onError() {
      self.read = readOld;
      self.keptUnread = keptUnreadOld;
    });
  };

  Item.prototype.keepUnread = function () {
    var readOld = this.read;
    var keptUnreadOld = this.keptUnread;
    this.read = false;
    this.keptUnread = true;
    self = this;
    editTag({
      i: this.id,
      a: 'user/-/state/com.google/kept-unread',
      r: 'user/-/state/com.google/read'
    }).then(function onSuccess() {
      chrome.extension.sendMessage({ method: "updateUnreadCount" });
    }, function onError() {
      self.read = readOld;
      self.keptUnread = keptUnreadOld;
    });
  };

  Item.prototype.star = function () {
    var oldValue = this.starred;
    this.starred = true;
    self = this;
    editTag({
      i: this.id,
      a: 'user/-/state/com.google/starred'
    }).then(null, function onError() {
      self.starred = oldValue;
    });
  };

  Item.prototype.unStar = function () {
    var oldValue = this.starred;
    this.starred = false;
    self = this;
    editTag({
      i: this.id,
      r: 'user/-/state/com.google/starred'
    }).then(null, function onError() {
      self.starred = oldValue;
    });
  };

  Item.prototype.getSummary = function () {
    return this.origin.title + ': ' + this.title;
  };

  var List = function (url, params) {
    this.url = url;
    this.params = params || {};
    this.continuation;
    this.loading = false;
    this.refreshTime = null;
    this.items = [];
  };

  List.prototype.loadItems = function (n, refresh) {
    var deferred = $q.defer();

    this.params.output = 'json';
    this.params.ck = Date.now();
    this.params.client = 'notifier';
    this.params.n = n || 1;

    if (refresh) {
      this.items = [];
      delete this.params.c;
      this.refreshTime = Date.now();
    } else {
      this.params.c = this.continuation;
    }

    if (!this.loading) {
      var self = this;
      self.loading = true;
      $http.get(this.url, {
        params: this.params
      }).success(function onSuccess(data) {
        console.log(data);
        data.items.forEach(function addToList(raw) {
          self.items.push(new Item(raw));
        });
        self.continuation = data.continuation;
        self.loading = false;
        deferred.resolve(self);
      }).error(function onError() {
        self.loading = false;
        deferred.reject('Failed to load items');
      });
    } else {
      deferred.reject('Failed to load items');
    }

    return deferred.promise;
  };

  List.prototype.isEmpty = function () {
    return this.items.length === 0;
  };

  List.prototype.getIterator = function (item) {
    return new ListIterator(this, item);
  };

  var ListIterator = function (list, item) {
    this.list = list;
    this.current = null;
    this.init(this.list.items.indexOf(item));
  };

  ListIterator.prototype.init = function (idx) {
    if (idx >= 0) {
      this.current = this.list.items[idx];
    } else {
      this.current = null;
    }
  };

  ListIterator.prototype.getNext = function () {
    var idx = this.list.items.indexOf(this.current);
    return this.list.items[idx + 1];
  };

  ListIterator.prototype.getPrevious = function () {
    var idx = this.list.items.indexOf(this.current);
    return this.list.items[idx - 1];
  };

  ListIterator.prototype.moveNext = function () {
    this.current = this.getNext();
  };

  ListIterator.prototype.movePrevious = function () {
    this.current = this.getPrevious();
  };

  List.prototype.markAllAsRead = function () {
    var markAllAsReadUrl = 'https://www.google.com/reader/api/0/mark-all-as-read';

    var doMarkAllAsRead = function (token) {
      var params = {
        output: 'json',
        T: token,
        s: 'user/-/state/com.google/reading-list'
      }
      return $http.post(markAllAsReadUrl, '', { params: params });
    }

    var self = this;
    var markAllAsReadLocal = function () {
      chrome.extension.sendMessage({ method: "updateUnreadCount" });
      self.items.forEach(function (item) {
        item.read = true;
        item.keptUnread = false;
        item.readStateLocked = true;
      });
    };

    withToken(doMarkAllAsRead).then(markAllAsReadLocal);
  };

  List.prototype.canLoadMore = function () {
    return this.continuation || this.loading;
  };


  return {
    getReadingList: function (n) {
      return new List('https://www.google.com/reader/api/0/stream/contents/user/-/state/com.google/reading-list');
    },

    getUnreadList: function (n) {
      return new List('https://www.google.com/reader/api/0/stream/contents/user/-/state/com.google/reading-list', {
        xt: 'user/-/state/com.google/read'
      });
    },

    getStarredList: function (n) {
      return new List('https://www.google.com/reader/api/0/stream/contents/user/-/state/com.google/starred');
    }
  };
});



services.factory('options', function($rootScope, $q) {

  var controllerObj = {};

  options.onChange(function (changes) {
    $rootScope.$apply(function () {
      for (var property in changes) {
        controllerObj[property] = changes[property].newValue;
      }
    });
  });

  return {
    get: function (callback) {
      options.get(function (values) {
        $rootScope.$apply(function () {
          angular.copy(values, controllerObj);
          if (callback instanceof Function) {
            callback(controllerObj);
          }
        });
      });
      return controllerObj;
    },

    set: function (values) {
      options.set(values);
    },

    enableSync: options.enableSync,

    isSyncEnabled: options.isSyncEnabled
  };
});