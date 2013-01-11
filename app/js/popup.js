'use strict';

angular.module('Reader.popup', ['Reader.services', 'Reader.directives', 'ngSanitize']);
  
function PopupCtrl($scope, reader) {
  
  $scope.views = {
    list: 'list',
    item: 'item'
  };  
  
  $scope.lists = {
    all: 'all',
    unread: 'unread'
  };
  
  $scope.view = $scope.views.list;  
  $scope.list = {
    items: []
  };
  $scope.iterator = {};
  $scope.currentList = $scope.lists.all;
  
  $scope.showItemView = function (index) {
    $scope.iterator = $scope.list.getIterator(index);
    $scope.view = $scope.views.item;
    $scope.iterator.current.markAsRead();
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
        $scope.list = reader.getUnreadList(40);
        break;
      case $scope.lists.all:
      default:
        $scope.currentList = $scope.lists.all;
        $scope.list = reader.getReadingList(40);
    }
  };
  
  $scope.showList = function (list) {
    $scope.currentList = list;
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
  
  $scope.refresh();
  
};