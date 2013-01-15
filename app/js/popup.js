'use strict';

angular.module('Reader.popup', ['Reader.services', 'Reader.directives', 'ngSanitize']);
  
function PopupCtrl($scope, $filter, reader, options) {
  
  
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
      list: reader.getReadingList()
    },
    
    unread: {
      name: 'unread',
      list: reader.getUnreadList(),
      filter: {
        read: false
      }
    },
    
    starred: {
      name: 'starred',
      list: reader.getStarredList(),
      filter: {
        starred: true
      }
    }
    
  };
  
  $scope.error = null;
  $scope.view = $scope.views.list;
  $scope.iterator = {};
  $scope.reader = $scope.readers.all;
  $scope.currentItem;
  
  $scope.showItemView = function (item) {
    $scope.currentItem = item;
    analytics.itemViewedIn($scope.currentItem, analytics.views.popup);
    $scope.currentItem.markAsRead();
    $scope.view = $scope.views.item;
  };
  
  $scope.openInChrome = function (item) {
    analytics.itemViewedIn(item, analytics.views.tab);
    item.markAsRead();
    $scope.openUrl(item.url, true);
  };
  
  $scope.showListView = function () {
    $scope.view = $scope.views.list;
  };
  
  $scope.showNextItem = function () {
    $scope.currentItem = $scope.currentItem.next;
    analytics.itemViewedIn($scope.currentItem, analytics.views.popup);
    $scope.currentItem.markAsRead();
  };
  
  $scope.showPreviousItem = function () {
    $scope.currentItem = $scope.currentItem.previous;
    analytics.itemViewedIn($scope.currentItem, analytics.views.popup);
    $scope.currentItem.markAsRead();
  };
  
  $scope.refresh = function () {  
    $scope.error = null;
    $scope.reader.list.loadItems(20, true).then(null, function onError (error) {
      $scope.error = error;
    });
  };
  
  var filter = $filter('filter');
  $scope.filterItems = function() {
    return filter($scope.reader.list.asArray(), $scope.reader.filter);
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
      item.star()
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