'use strict';

angular.module('Reader.popup', [
  'Reader.services.reader', 
  'Reader.services.List', 
  'Reader.services.options', 
  'Reader.directives', 
  'Reader.filters', 
  'ngSanitize'
]);

function PopupCtrl($scope, options, reader, List) {
  
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

  // TODO: lazy creation of lists
  $scope.readers = {

    all: {
      name: 'all',
      list: new List({
        tag: reader.tags.READING_LIST
      })
    },

    unread: {
      name: 'unread',
      list: new List({
        tag: reader.tags.READING_LIST,
        excludeTag: reader.tags.READ
      })
    },

    starred: {
      name: 'starred',
      list: new List({
        tag: reader.tags.STARRED
      })
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
    $scope.error = null;
    $scope.reader.list.loadItems(20, true).then(
      null, 
      function onError (error) {
        $scope.error = error;
        chrome.extension.sendMessage({ method: "updateUnreadCount" });      
      });
  };

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

};
