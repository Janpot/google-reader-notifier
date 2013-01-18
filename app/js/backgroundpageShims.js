/*jslint browser: true, devel: true, indent: 2 */
/*globals chrome */

(function () {
  'use strict';

  var TIMEOUT_PREFIX = 'timeout-';
  var INTERVAL_PREFIX = 'interval-';

  window.setTimeout = (function () {
    var currId = 0;

    return function (callback, ms) {
      console.log('set');
      return (function (id) {
        var name = TIMEOUT_PREFIX + id;

        chrome.alarms.onAlarm.addListener(function (alarm) {
          if (alarm.name === name) {
            callback();
          }
        });

        chrome.alarms.create(name, { delayInMinutes : ms / 60000 });

        return id;
      }(currId++));
    };

  }());

  window.clearTimeout = function (id) {
    var name = TIMEOUT_PREFIX + id;
    chrome.alarms.clear(name);
  };

  window.setInterval = (function () {
    var currId = 0;

    return function (callback, ms) {
      return (function (id) {
        var name = INTERVAL_PREFIX + id;

        chrome.alarms.onAlarm.addListener(function (alarm) {
          if (alarm.name === name) {
            callback();
          }
        });

        chrome.alarms.create(name, { periodInMinutes : ms / 60000 });

        return id;
      }(currId++));
    };

  }());

  window.clearInterval = function (id) {
    var name = INTERVAL_PREFIX + id;
    chrome.alarms.clear(name);
  };

}());