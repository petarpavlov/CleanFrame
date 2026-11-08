/* Clock, date and greeting for the Bonjourr-style Home overlay. */
(function (global) {
  'use strict';

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var NAME = 'Petar';

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function clockText(date) {
    var d = date || new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function dateText(date) {
    var d = date || new Date();
    return DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
  }

  function partOfDay(date) {
    var h = (date || new Date()).getHours();
    if (h >= 6 && h <= 11) return 'morning';
    if (h >= 12 && h <= 17) return 'afternoon';
    if (h >= 18 && h <= 20) return 'evening';
    return 'night';
  }

  function greeting(date, name) {
    return 'Good ' + partOfDay(date) + ', ' + (name || NAME);
  }

  global.CleanFrameHero = {
    NAME: NAME,
    clockText: clockText,
    dateText: dateText,
    partOfDay: partOfDay,
    greeting: greeting
  };
})(window);
