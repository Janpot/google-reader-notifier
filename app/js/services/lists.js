angular.module('Reader.services.lists', ['Reader.services.reader'])
  .factory('Item', function(reader) {
    
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
  
      this.url = '';
      if (raw.alternate && raw.alternate[0] && raw.alternate[0].href) {
        this.url = raw.alternate[0].href;
      }
  
      this.origin = raw.origin ? {
        title: raw.origin.title ? normalize(raw.origin.title) : undefined,
        url: raw.origin.htmlUrl
      } : undefined;
  
      this.author = raw.author;
      this.categories = raw.categories || [];
  
      this.id = raw.id;
  
      if (raw.published) {
        this.time = new Date(raw.published * 1000);
      }
  
      this.readStateLocked = raw.isReadStateLocked || false;
    };
    
    Item.prototype.addCategory = function (tag) {
      if (tag && !this.hasCategory(tag)) {
        this.categories.push(tag);
      }
    };
    
    Item.prototype.removeCategory = function (tag) {
      if (tag && this.hasCategory(tag)) {
        var categoryMatcher = reader.matcherForTag(tag);
        this.categories = this.categories.filter(function matches(category) {
          return !categoryMatcher.test(category);
        });
      }
    };
    
    Item.prototype.hasCategory = function (tag) {
      var categoryMatcher = reader.matcherForTag(tag);
      return this.categories.some(function matches(category) {
        return categoryMatcher.test(category);
      });
    };
    
    Item.prototype.editTag = function (cfg) {
      var self = this;
      this.addCategory(cfg.a);
      this.removeCategory(cfg.r);
      
      return reader.editTag({
        i: this.id,
        a: cfg.a,
        r: cfg.r
      }).then(null, function onError() {
        self.removeCategory(cfg.a);
        self.addCategory(cfg.r);
      });
    }
    
    Item.prototype.isRead = function () {
      return this.hasCategory(reader.tags.READ);
    };
    
    Item.prototype.isKeptUnread = function () {
      return this.hasCategory(reader.tags.KEPT_UNREAD);
    };
    
    Item.prototype.isStarred = function () {
      return this.hasCategory(reader.tags.STARRED);
    };
  
    Item.prototype.markAsRead = function () {
      return this.editTag({
        a: reader.tags.READ,
        r: reader.tags.KEPT_UNREAD
      });
    };
  
    Item.prototype.keepUnread = function () {
      return this.editTag({
        a: reader.tags.KEPT_UNREAD,
        r: reader.tags.READ
      });
    };
  
    Item.prototype.star = function () {
      return this.editTag({
        a: reader.tags.STARRED
      });
    };
  
    Item.prototype.unStar = function () {
      return this.editTag({
        r: reader.tags.STARRED
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
    
    return Item;
  
  })


  .factory('List', function ($q, reader, Item) {
  
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
        deferred.reject('Already loading new items');
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
        // TODO: move this out of here (to the controller)
        chrome.extension.sendMessage({ method: "updateUnreadCount" });
        
        self.items.forEach(function (item) {
          item.addCategory(reader.tags.READ);
          item.removeCategory(reader.tags.KEPT_UNREAD);
          item.readStateLocked = true;
        });
      };
      
      reader.markAllAsRead().then(markAllAsReadLocal);
    };
  
    List.prototype.canLoadMore = function () {
      return this.continuation || this.loading;
    };
  
  
    return List;
  })

  .factory('lists', function (List, reader) {
    return {
      getReadingList: function (n) {
        return new List({
          tag: reader.tags.READING_LIST
        });
      },
  
      getUnreadList: function (n) {
        return new List({
          tag: reader.tags.READING_LIST,
          excludeTag: reader.tags.READ
        });
      },
  
      getStarredList: function (n) {
        return new List({
          tag: reader.tags.STARRED
        });
      }
    };
  });