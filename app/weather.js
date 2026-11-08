/* Belgrade weather from Open-Meteo. No API key. */
(function (global) {
  'use strict';

  var LAT = 44.79, LON = 20.45;
  var URL = 'https://api.open-meteo.com/v1/forecast?latitude=' + LAT + '&longitude=' + LON
    + '&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,sunrise,sunset'
    + '&timezone=Europe%2FBelgrade&forecast_days=1';
  var REFRESH_MS = 30 * 60 * 1000;
  var current = null, listeners = [], timer = 0, requestN = 0;

  function roundTemp(value) {
    var n = Number(value);
    if (!isFinite(n)) return null;
    return Math.round(n);
  }

  function describe(code) {
    var c = Number(code);
    if (c === 0) return 'Clear';
    if (c === 1) return 'Mainly clear';
    if (c === 2) return 'Partly cloudy';
    if (c === 3) return 'Overcast';
    if (c === 45 || c === 48) return 'Foggy';
    if (c >= 51 && c <= 57) return 'Drizzle';
    if (c >= 61 && c <= 67) return 'Rain';
    if (c >= 71 && c <= 77) return 'Snow';
    if (c >= 80 && c <= 82) return 'Showers';
    if (c >= 85 && c <= 86) return 'Snow showers';
    if (c >= 95 && c <= 99) return 'Thunderstorm';
    return 'Clear';
  }

  function iconKind(code, isDay) {
    var c = Number(code);
    if (c === 0 || c === 1) return isDay ? 'sun' : 'moon';
    if (c === 2 || c === 3) return 'cloud';
    if (c === 45 || c === 48) return 'fog';
    if (c >= 71 && c <= 77) return 'snow';
    if (c >= 85 && c <= 86) return 'snow';
    if (c >= 95) return 'thunder';
    if (c >= 51) return 'rain';
    return isDay ? 'sun' : 'moon';
  }

  function iconSvg(kind) {
    var body = {
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      moon: '<path d="M16.8 14.6A7 7 0 0 1 9.2 4.8 7 7 0 1 0 16.8 14.6Z"/>',
      cloud: '<path d="M7 16h10a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.6 1.5A3.5 3.5 0 0 0 7 16Z"/>',
      rain: '<path d="M7 14h10a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.6 1.5A3.5 3.5 0 0 0 7 14Z"/><path d="M8.5 17.5 7 21M12 17.5 10.5 21M15.5 17.5 14 21"/>',
      snow: '<path d="M7 14h10a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.6 1.5A3.5 3.5 0 0 0 7 14Z"/><path d="M8.5 18h.1M12 18h.1M15.5 18h.1"/>',
      fog: '<path d="M4 10h16M5 14h14M7 18h10"/>',
      thunder: '<path d="M7 14h10a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.6 1.5A3.5 3.5 0 0 0 7 14Z"/><path d="m11 14 2.2 4h-2L13 22"/>'
    }[kind] || '';
    return '<svg class="weather-ico" viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
  }

  function weatherLine(code, temp, high) {
    if (temp === null || high === null) return '';
    return describe(code) + '. It is currently ' + temp + '° with a high of ' + high + '° today.';
  }

  function parseTime(value) {
    if (!value || typeof value !== 'string') return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function parseForecast(data) {
    if (!data || typeof data !== 'object') return null;
    var cur = data.current || {}, daily = data.daily || {};
    var temp = roundTemp(cur.temperature_2m);
    var highs = daily.temperature_2m_max;
    var high = roundTemp(highs && highs[0]);
    var code = cur.weather_code;
    var isDay = cur.is_day === 1 || cur.is_day === true;
    if (temp === null || high === null) return null;
    return {
      temp: temp,
      high: high,
      code: code,
      isDay: isDay,
      line: weatherLine(code, temp, high),
      tempLabel: temp + '°',
      icon: iconSvg(iconKind(code, isDay)),
      sunrise: parseTime(daily.sunrise && daily.sunrise[0]),
      sunset: parseTime(daily.sunset && daily.sunset[0])
    };
  }

  function notify() {
    listeners.forEach(function (fn) { fn(current); });
  }

  function getJson(url, done) {
    var xhr = new XMLHttpRequest(), finished = false;
    xhr.open('GET', url, true);
    xhr.timeout = 8000;
    xhr.onload = function () {
      if (finished) return;
      finished = true;
      if (xhr.status < 200 || xhr.status >= 300) { done({ message: 'HTTP ' + xhr.status }); return; }
      try { done(null, JSON.parse(xhr.responseText)); }
      catch (err) { done({ message: 'bad json' }); }
    };
    xhr.onerror = xhr.ontimeout = function () { if (finished) return; finished = true; done({ message: 'network' }); };
    try { xhr.send(); } catch (err) { done({ message: 'network' }); }
  }

  function pull() {
    var n = ++requestN;
    getJson(URL, function (err, data) {
      var parsed;
      if (n !== requestN) return;
      parsed = err ? null : parseForecast(data);
      if (parsed) { current = parsed; notify(); }
    });
  }

  function start() {
    pull();
    if (timer) clearTimeout(timer);
    timer = setTimeout(function tick() {
      pull();
      timer = setTimeout(tick, REFRESH_MS);
    }, REFRESH_MS);
  }

  function stop() { clearTimeout(timer); timer = 0; }

  function subscribe(fn) { listeners.push(fn); if (current) fn(current); }

  global.CleanFrameWeather = {
    LAT: LAT, LON: LON, URL: URL,
    describe: describe, iconKind: iconKind, weatherLine: weatherLine, parseForecast: parseForecast,
    start: start, stop: stop, pull: pull, subscribe: subscribe,
    state: function () { return current; }
  };
})(window);
