angular.module('Reader.filters', [])

  .filter('conditional', function() {
    return function(condition, ifTrue, ifFalse) {
      return condition ? ifTrue : ifFalse;
    };
  })

  .filter('prettyDateTime', function($filter) {
    var format = $filter('date');

    return function (date) {
      if (!date) {
        return '';
      }

      var now = new Date();
      var year = now.getFullYear();
      var month = now.getMonth();
      var day = now.getDate();

      var today = new Date(year, month, day);
      if (date >= today) {
        console.log(date, today);
        return format(date, 'shortTime');
      }

      var yesterday = new Date(year, month, day - 1);
      if (date >= yesterday) {
        return 'yesterday';
      }

      return format(date, 'fullDate');
    };

  });