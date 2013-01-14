'use strict';

angular.module('Reader.popup', ['Reader.services', 'Reader.directives', 'ngSanitize']);
  
function PopupCtrl($scope, reader, options) {
  
  
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
  
  $scope.lists = {
    all: 'all',
    unread: 'unread'
  };
  
  $scope.error = null;
  $scope.view = $scope.views.list;  
  $scope.list = {
    items: []
  };
  $scope.iterator = {};
  $scope.currentList = $scope.lists.all;
  
  $scope.showItemView = function (index) {
    $scope.iterator = $scope.list.getIterator(index);
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
    switch ($scope.currentList) {
      case $scope.lists.unread:
        $scope.list = reader.getUnreadList();
        break;
      case $scope.lists.all:
      default:
        $scope.currentList = $scope.lists.all;
        $scope.list = reader.getReadingList();
    }
    $scope.error = null;
    $scope.list.loadItems(20).then(null, function onError (error) {
      $scope.error = error;
    });
  };
  
  $scope.showList = function (list) {
    $scope.currentList = list;
    options.set({ defaultList: $scope.currentList });
    $scope.refresh();
  };
  
  $scope.loadMoreItems = function () {
    $scope.list.loadItems(10);
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
    if (defaultList && $scope.lists[defaultList]) {
      $scope.currentList = defaultList;
    }    
    $scope.refresh();
  });
  
};