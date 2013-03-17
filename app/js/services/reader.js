angular.module('Reader.services.reader', [])
  .factory('reader', function ($http, $q) {
    
    var service = { };
    
    var TAG_BASE = 'user/-/state/com.google/';  
    service.tags = {
      READ: TAG_BASE + 'read',
      STARRED: TAG_BASE + 'starred',
      KEPT_UNREAD: TAG_BASE + 'kept-unread',
      FRESH: TAG_BASE + 'fresh',
      READING_LIST: TAG_BASE + 'reading-list'
    };
    
    // urls
    var URL_BASE = 'https://www.google.com/reader/api/0/',
        URL_TOKEN = URL_BASE + 'token',
        URL_EDIT_TAG = URL_BASE + 'edit-tag',
        URL_MARK_ALL_AS_READ = URL_BASE + 'mark-all-as-read',
        URL_STREAM_CONTENTS = URL_BASE + 'stream/contents/';
    
    
    service.lists = {
      READING_LIST: {
        url: URL_STREAM_CONTENTS + service.tags.READING_LIST
      },
      UNREAD_LIST: {
        url: URL_STREAM_CONTENTS + service.tags.READING_LIST,
        params: {
          xt: service.tags.READ
        }
      },
      STARRED_LIST: {
        url: URL_STREAM_CONTENTS + service.tags.STARRED
      }
    };
    
    var token;
    
    var onRefreshTokenSuccess = function (response) {
      token = response.data;
      return token;
    };
  
    var refreshToken = function () {
      return $http.get(URL_TOKEN).then(onRefreshTokenSuccess);
    };
  
    var ensureToken = function () {
      if(token === undefined) {
        return refreshToken();
      } else {
        return $q.when(token);
      }
    };
    
    // Ensures a token is present before executing the request. 
    // Automatically retries if the token is expired.
    var withToken = function (httpRequest) {
      var onHttpSuccess = function (value) {
        return value;
      };
  
      var retryWithNewToken = function (error) {
        return refreshToken().then(httpRequest);
      };
  
      return ensureToken().then(httpRequest).then(onHttpSuccess, retryWithNewToken);
    };
    
    
    
    
    service.editTag = function (params) {
      var doEditTag = function (token) {
        params = params || {};
        params.output = 'json';
        params.T = token;
        return $http.post(URL_EDIT_TAG, '', { params: params });
      };
  
      return withToken(doEditTag);
    };
    
    service.markAllAsRead = function () {
      var doMarkAllAsRead = function (token) {
        var params = {
          output: 'json',
          T: token,
          s: 'user/-/state/com.google/reading-list'
        }
        return $http.post(URL_MARK_ALL_AS_READ, '', { params: params });
      }
  
      return withToken(doMarkAllAsRead);
    };
    
    service.getList = function (config, count, continuation) {
      var params = config.params || {};
      
      params.output = 'json';
      params.ck = Date.now();
      params.client = 'notifier';
      
      if (count) {
        params.n = count
      }
      
      if (continuation) {
        params.c = continuation
      }
      
      return $http.get(config.url, {
        params: params
      }).then(function (response) {
        return response.data;
      });
    };
    
    return service;
    
  });
