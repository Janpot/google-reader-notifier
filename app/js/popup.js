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
    if (!$scope.iterator.current.keptUnread) {
      $scope.iterator.current.markAsRead();
    }
    $scope.view = $scope.views.item;
  };

  $scope.openInChrome = function (item) {
    analytics.itemViewedIn(item, analytics.views.tab);
    if (!item.keptUnread) {
      item.markAsRead();
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
    if (!$scope.iterator.current.keptUnread) {
      $scope.iterator.current.markAsRead();
    }
    if (!$scope.iterator.getNext() && $scope.reader.list.canLoadMore()) {
      $scope.reader.list.loadItems(10);
    }
  };

  $scope.showPreviousItem = function () {
    $scope.iterator.movePrevious();
    analytics.itemViewedIn($scope.iterator.current, analytics.views.popup);
    if (!$scope.iterator.current.keptUnread) {
      $scope.iterator.current.markAsRead();
    }
  };

  $scope.refresh = function () {
    $scope.error = null;
    $scope.reader.list.loadItems(20, true).then(null, function onError (error) {
      $scope.error = error;
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

  $scope.loadMoreItems = function () {
    $scope.reader.list.loadItems(10);
    return true;
  };

  $scope.rate = function (item) {
    if (item.starred) {
      item.unStar();
    } else {
      item.star();
    }
  };

  $scope.toggleKeepUnread = function (item) {
    if (item.keptUnread) {
      item.markAsRead();
    } else {
      item.keepUnread();
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