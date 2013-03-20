angular.module('Reader.services.reader', [])
  .factory('reader', function ($http, $q) {
    
    var service = { };
    
    var tagSuffixes = {
      READ: 'read',
      STARRED: 'starred',
      KEPT_UNREAD: 'kept-unread',
      FRESH: 'fresh',
      READING_LIST: 'reading-list'
    };
    
    var TAG_BASE = 'user/-/state/com.google/';  
    service.tags = {};
    var matchers = {};
    for (var key in tagSuffixes) {
      var tag = TAG_BASE + tagSuffixes[key];
      service.tags[key] = tag
      matchers[tag] = new RegExp('^user\\/[^\/]+\\/state\\/com.google\\/' + tagSuffixes[key] + '$')
    }
    
    service.matcherForTag = function (tag) {
      return matchers[tag];
    };
    
    // urls
    var URL_BASE = 'https://www.google.com/reader/api/0/',
        URL_TOKEN = URL_BASE + 'token',
        URL_EDIT_TAG = URL_BASE + 'edit-tag',
        URL_MARK_ALL_AS_READ = URL_BASE + 'mark-all-as-read',
        URL_STREAM_CONTENTS = URL_BASE + 'stream/contents/';
    
    var constructListUrl = function (tag) {
      return URL_STREAM_CONTENTS + tag;
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
      var params = {};
      
      params.output = 'json';
      params.ck = Date.now();
      params.client = 'notifier';
      
      if (config.excludeTag) {
        params.xt = config.excludeTag;
      }
      
      if (count) {
        params.n = count
      }
      
      if (continuation) {
        params.c = continuation
      }
      
      var url = constructListUrl(config.tag);
      
      return $http.get(url, {
        params: params
      }).then(function (response) {
        return response.data;
      });
    };
    
    return service;
    
  });
