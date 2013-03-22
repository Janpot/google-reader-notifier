'use strict';

angular.module('Reader.popup', ['Reader.services.lists', 'Reader.services.options', 'Reader.directives', 'Reader.filters', 'ngSanitize']);

function PopupCtrl($scope, $filter, lists, options) {
  
  $scope.openUrl = function (url, background) {
    // TODO: move this to a shared lib (for directive)
    if (/^https?:\/\//i.test(url)) {
      var tab = {url: url};

      if(background) {
        tab.selected =  false;
      }

      chrome.tabs.create(tab);
    }
  };

  $scope.views = {
    list: 'list',
    item: 'item'
  };

  $scope.readers = {

    all: {
      name: 'all',
      list: lists.getReadingList()
    },

    unread: {
      name: 'unread',
      list: lists.getUnreadList(),
      filter: {
        read: false
      }
    },

    starred: {
      name: 'starred',
      list: lists.getStarredList(),
      filter: {
        starred: true
      }
    }

  };

  $scope.error = null;
  $scope.view = $scope.views.list;
  $scope.reader = $scope.readers.all;
  $scope.iterator;

  $scope.showItemView = function (item) {
    $scope.iterator = $scope.reader.list.getIterator(item);
    analytics.itemViewedIn($scope.iterator.current, analytics.views.popup);
    if (!$scope.iterator.current.isKeptUnread()) {
      $scope.markAsRead($scope.iterator.current);
    }
    $scope.view = $scope.views.item;
  };

  $scope.openInChrome = function (item) {
    analytics.itemViewedIn(item, analytics.views.tab);
    if (!item.isKeptUnread()) {
      $scope.markAsRead(item);
    }
    $scope.openUrl(item.url, true);
    return false;
  };

  $scope.showListView = function () {
    $scope.view = $scope.views.list;
  };

  $scope.showNextItem = function () {
    $scope.iterator.moveNext();
    analytics.itemViewedIn($scope.iterator.current, analytics.views.popup);
    if (!$scope.iterator.current.isKeptUnread()) {
      $scope.markAsRead($scope.iterator.current);
    }
    if (!$scope.iterator.getNext() && $scope.reader.list.canLoadMore()) {
      $scope.reader.list.loadItems(10);
    }
  };

  $scope.showPreviousItem = function () {
    $scope.iterator.movePrevious();
    analytics.itemViewedIn($scope.iterator.current, analytics.views.popup);
    if (!$scope.iterator.current.isKeptUnread()) {
      $scope.markAsRead($scope.iterator.current);
    }
  };

  $scope.refresh = function () {
    $scope.loadingItems = true;
    $scope.refreshing = true;
    $scope.error = null;
    $scope.reader.list.loadItems(20, true).then(function onSuccess() {
      $scope.loadingItems = false;
      $scope.refreshing = false;
    }, function onError (error) {
      $scope.error = error;
      $scope.loadingItems = false;
      $scope.refreshing = false;
      chrome.extension.sendMessage({ method: "updateUnreadCount" });      
    });
  };

  var filter = $filter('filter');
  $scope.filterItems = function() {
    return filter($scope.reader.list.items, $scope.reader.filter);
  }

  $scope.showList = function (list) {
    $scope.reader = list;
    options.set({ defaultList: $scope.reader.name });
    $scope.refresh();
  };
  
  var updateUnreadCount = function () {
    chrome.extension.sendMessage({ method: "updateUnreadCount" });
  };
  
  $scope.markAsRead = function (item) {
    item.markAsRead().then(updateUnreadCount);
  };
  
  $scope.keepUnread = function (item) {
    item.keepUnread().then(updateUnreadCount);
  };

  $scope.rate = function (item) {
    if (item.isStarred()) {
      item.unStar();
    } else {
      item.star();
    }
  };

  $scope.toggleKeepUnread = function (item) {
    if (item.isKeptUnread()) {
      $scope.markAsRead(item);
    } else {
      $scope.keepUnread(item);
    }
  };



  // update unreadcount when popup opens
  chrome.extension.sendMessage({ method: "updateUnreadCount" });

  var getReaderByName = function (name) {
    for (var property in $scope.readers) {
      if ($scope.readers[property].name === name) {
        return $scope.readers[property];
      }
    }
    return $scope.readers.all;
  };

  // refresh the list
  options.get(function (values) {
    $scope.reader = getReaderByName(values.defaultList);
    $scope.refresh();
  });
  
  
  
  
  
  var NUMBER_OF_SCREENITEMS = 7;
  var START_PRELOAD_OFFSET = 5;
  var firstItemIndex = 0;
  
  $scope.loadingItems = true;
  
  var requestMoreItems = function () {
    if (!$scope.loadingItems && $scope.reader.list.canLoadMore()) {
      $scope.loadingItems = true;
      $scope.reader.list.loadItems(20).then(
        function onSuccess() {
          $scope.loadingItems = false;
        }, 
        function onError(error) {
          $scope.error = error;
          $scope.loadingItems = false;
        }
      );
    }
  };
  
  var screenItems = [];
  
  $scope.getScreenItems = function () {
    var list = $scope.reader.list;
    firstItemIndex = Math.max(firstItemIndex, 0);
    var lastItemIndex = firstItemIndex + NUMBER_OF_SCREENITEMS;
    var overflow = lastItemIndex - list.items.length;
    
    if (overflow > 0) {
      lastItemIndex = list.items.length;
      firstItemIndex = Math.max(firstItemIndex - overflow, 0);      
    }
    
    if (overflow + START_PRELOAD_OFFSET > 0) {
      requestMoreItems();
    }
    

    return list.items.slice(firstItemIndex, lastItemIndex);
  };
  
  $scope.offsetItems = function (delta) {
    firstItemIndex -= Math.round(delta);    
  };
  
  $scope.noMorePrevious = function () {
    return firstItemIndex <= 0;
  };
  
  $scope.noMoreNext = function () {
    return firstItemIndex + NUMBER_OF_SCREENITEMS >= $scope.reader.list.items.length && !$scope.reader.list.canLoadMore();
  };

};
