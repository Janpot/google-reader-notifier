angular.module('Reader.services.list', ['Reader.services.reader'])
  .factory('list', function ($q, reader) {
  
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
      reader.editTag({
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
      reader.editTag({
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
      reader.editTag({
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
      reader.editTag({
        i: this.id,
        r: 'user/-/state/com.google/starred'
      }).then(null, function onError() {
        self.starred = oldValue;
      });
    };
  
    Item.prototype.getSummary = function () {
      return this.origin.title + ': ' + this.title;
    };
    
    Item.prototype.loadImages = function () {
      var imageMatcher = /<img[^>]* src=\"([^\"]*)\"/g;
      var match = null;
      while (match = imageMatcher.exec(this.content)) {
        var image = document.createElement('img');
        image.src = match[1];
      }    
    };
  
    var List = function (config) {
      this.config = config;
      this.continuation;
      this.loading = false;
      this.refreshTime = null;
      this.items = [];
    };
  
    List.prototype.loadItems = function (n, refresh) {
      var deferred = $q.defer();
  
      if (refresh) {
        this.items = [];
        this.continuation = null;
        this.refreshTime = Date.now();
      }
  
      if (!this.loading) {
        var self = this;
        self.loading = true;
        reader.getList(this.config, n, this.continuation).then(
          function onSuccess(data) {
            console.log(data);
            data.items.forEach(function addToList(raw) {
              self.items.push(new Item(raw));
            });
            self.continuation = data.continuation;
            self.loading = false;
            deferred.resolve(self);
          }, 
          function onError() {
            self.loading = false;
            deferred.reject('Failed to load items');
          }
        );
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
      
      // preload next and previous items' images
      var next = this.getNext();
      if (next) {
        next.loadImages();
      }
      var previous = this.getPrevious();
      if (previous) {
        previous.loadImages();
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
      // preload next items images
      var next = this.getNext();
      if (next) {
        next.loadImages();
      }
    };
  
    ListIterator.prototype.movePrevious = function () {
      this.current = this.getPrevious();
      // preload previous items images
      var previous = this.getPrevious();
      if (previous) {
        previous.loadImages();
      }
    };
  
    List.prototype.markAllAsRead = function () {
      var self = this;
      var markAllAsReadLocal = function () {
        chrome.extension.sendMessage({ method: "updateUnreadCount" });
        self.items.forEach(function (item) {
          item.read = true;
          item.keptUnread = false;
          item.readStateLocked = true;
        });
      };
      
      reader.markAllAsRead().then(markAllAsReadLocal);
    };
  
    List.prototype.canLoadMore = function () {
      return this.continuation || this.loading;
    };
  
  
    return {
      getReadingList: function (n) {
        return new List(reader.lists.READING_LIST);
      },
  
      getUnreadList: function (n) {
        return new List(reader.lists.UNREAD_LIST);
      },
  
      getStarredList: function (n) {
        return new List(reader.lists.STARRED_LIST);
      }
    };
  });