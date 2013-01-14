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
    }
    
  };
  
  $scope.error = null;
  $scope.view = $scope.views.list;
  $scope.iterator = {};
  $scope.reader = $scope.readers.all;
  
  $scope.showItemView = function (index) {
    $scope.iterator = $scope.reader.list.getIterator(index);
    analytics.itemViewedIn($scope.iterator.current, analytics.views.popup);
    $scope.iterator.current.markAsRead();
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
    $scope.iterator.moveNext();     
    analytics.itemViewedIn($scope.iterator.current, analytics.views.popup);
    $scope.iterator.current.markAsRead();
  };
  
  $scope.showPreviousItem = function () {
    $scope.iterator.movePrevious();
    analytics.itemViewedIn($scope.iterator.current, analytics.views.popup);
    $scope.iterator.current.markAsRead();
  };
  
  $scope.refresh = function () {  
    $scope.error = null;
    $scope.reader.list.loadItems(20, true).then(null, function onError (error) {
      $scope.error = error;
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
      item.star()
    }
  };
  
  // update unreadcount when popup opens
  chrome.extension.sendMessage({ method: "updateUnreadCount" });
  
  // refresh the list
  options.get(function (values) {
    var defaultList = values.defaultList;
    if (defaultList && $scope.readers[defaultList]) {
      $scope.reader = $scope.readers[defaultList];
    }    
    $scope.refresh();
  });
  
};