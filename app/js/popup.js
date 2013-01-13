'use strict';

angular.module('Reader.popup', ['Reader.services', 'Reader.directives', 'ngSanitize']);
  
function PopupCtrl($scope, reader, options) {
  
  $scope.openUrl = function (url, background) {
    var tab = {url: url};

    if(background) {
      tab.selected =  false;
    }

    chrome.tabs.create(tab);
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
    $scope.iterator.current.markAsRead();
    $scope.view = $scope.views.item;
  };
  
  $scope.openInChrome = function (item) {
    item.markAsRead();
    $scope.openUrl(item.url, true);
  };
  
  $scope.showListView = function () {
    $scope.view = $scope.views.list;
  };
  
  $scope.showNextItem = function () {
    $scope.iterator.moveNext();     
    $scope.iterator.current.markAsRead();
  };
  
  $scope.showPreviousItem = function () {
    $scope.iterator.movePrevious(); 
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
    $scope.list.loadItems(240).then(null, function onError (error) {
      $scope.error = error;
    });
  };
  
  $scope.showList = function (list) {
    $scope.currentList = list;
    console.log('setting list: ' + $scope.currentList);
    options.set({ defaultList: $scope.currentList });
    $scope.refresh();
  };
  
  $scope.loadMoreItems = function () {
    $scope.list.loadItems(20);
    return true;
  };
  
  $scope.getContent = function () {
    var item = $scope.getItem();
    if (item.content) {
      return item.content.content;
    } else if (item.summary) {
      return item.summary.content;
    }
    
    return '';
  };
  
  $scope.rate = function (item) {
    if (item.starred) {
      item.unStar();
    } else {
      item.star()
    }
  }
  
  $scope.$watch('error', function (value) {
    console.log('error', value);
  });
  
  // update unreadcount when popup opens
  chrome.extension.sendMessage({ method: "updateUnreadCount" });
  
  // refresh the list
  options.get(function (values) {
    console.log('options:', values);
    switch (values.defaultList) {
      
      case $scope.lists.unread: 
        $scope.currentList = $scope.lists.unread;
        break;
      case $scope.lists.all:
      default: 
        $scope.currentList = $scope.lists.all;
    }
    
    $scope.refresh();
  });
  
};