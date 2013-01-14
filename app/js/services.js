'use strict';

var services = angular.module('Reader.services', []);

services.factory('reader', function ($rootScope, $http, $q) {
  
  var normalize = function (str) {
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
    return raw.categories.some(function matches(category) {
      return categoryMatcher.test(category);
    });
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
  
  var addTag = function (itemId, tag) {
    return editTag({
      i: itemId,
      a: tag
    });
  };
  
  var removeTag = function (itemId, tag) {
    return editTag({
      i: itemId,
      r: tag
    });
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
    this.title = normalize(raw.title);
    this.url = ''
    if (raw.alternate && raw.alternate[0] && raw.alternate[0].href) {
      this.url = raw.alternate[0].href;
    }
    this.origin = {
      title: normalize(raw.origin.title),
      url: raw.origin.htmlUrl
    };
    this.read = hasCategory(raw, /^user\/[-\d]+\/state\/com\.google\/read$/);
    this.starred = hasCategory(raw, /^user\/[-\d]+\/state\/com\.google\/starred$/);
    this.id = raw.id;
    
    if (raw.published) {
      this.time = new Date(raw.published * 1000);
    }
  };
  
  Item.prototype.markAsRead = function () {
    var oldValue = this.read;
    this.read = true;
    self = this;
    addTag(this.id, 'user/-/state/com.google/read').then(function onSuccess() {
      chrome.extension.sendMessage({ method: "updateUnreadCount" });
    }, function onError() {
      self.read = oldValue;
    });
  };
  
  Item.prototype.markUnread = function () {
    self = this;
    editTag({
      i: this.id,
      a: 'user/-/state/com.google/fresh',
      r: 'user/-/state/com.google/read'
    }).then(function () {
      self.read = false;
      chrome.extension.sendMessage({ method: "updateUnreadCount" });
    });
  };
  
  Item.prototype.star = function () {
    var oldValue = this.starred;
    this.starred = true;
    self = this;
    addTag(this.id, 'user/-/state/com.google/starred').then(null, function onError() {
      self.starred = oldValue;
    });
  };
  
  Item.prototype.unStar = function () {
    var oldValue = this.starred;
    this.starred = false;
    self = this;
    removeTag(this.id, 'user/-/state/com.google/starred').then(null, function onError() {
      self.starred = oldValue;
    });
  };
  
  var List = function (url, n, params) {
    this.url = url;
    this.params = params || {};    
    this.items = [];
    this.continuation;
    this.loading = false;
    this.empty = false;
  };
  
  List.prototype.loadItems = function (n, refresh) {
    var deferred = $q.defer();
    
    this.params.output = 'json';
    this.params.ck = Date.now();
    this.params.client = 'notifier';
    this.params.n = n || 1;
    
    if (refresh) {
      this.items = [];
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
        self.empty = data.items.length === 0;
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
  
  List.prototype.markAllAsRead = function (n) {
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
      });
    };
    
    withToken(doMarkAllAsRead).then(markAllAsReadLocal);
  };
  
  List.prototype.canLoadMore = function (n) {
    return this.continuation || this.loading;
  };
  
  List.prototype.getIterator = function (index) {
    return new ListIterator(this, index);
  };
  
  var ListIterator = function (list, index) {
    this.list = list;
    this.index;
    this.current;
    this.previousDescr;
    this.nextDescr;
    this.init(index || 0);
  };
  
  ListIterator.prototype.init = function (index) {
    this.index = index;
    this.current = this.list.items[this.index];
    
    if (this.hasNext()) {
      var next = this.list.items[this.index + 1];
      this.nextDescr = next.origin.title + ': ' + next.title;
    }
    if (this.hasPrevious()) {
      var previous = this.list.items[this.index - 1];
      this.previousDescr = previous.origin.title + ': ' + previous.title;
    }
  };
  
  ListIterator.prototype.hasNext = function () {
    return this.index < this.list.items.length - 1;
  };
  
  ListIterator.prototype.hasPrevious = function () {
    return this.index > 0;
  };
  
  ListIterator.prototype.moveNext = function () {
    this.init(this.index + 1);
    // ensure more items in the list
    var needsMoreItems = (this.index >= this.list.items.length - 5) && !this.list.loading && this.list.canLoadMore();
    if (needsMoreItems) {
      this.list.loadItems(10);
    }
  };
  
  ListIterator.prototype.movePrevious = function () {
    this.init(this.index - 1);
  };
  
  return {
    getReadingList: function (n) {
      return new List('https://www.google.com/reader/api/0/stream/contents/user/-/state/com.google/reading-list', n);
    },
    
    getUnreadList: function (n) {
      return new List('https://www.google.com/reader/api/0/stream/contents/user/-/state/com.google/reading-list', n, {
        xt: 'user/-/state/com.google/read'
      });
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