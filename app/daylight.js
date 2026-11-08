/* Bonjourr Daylight: Unsplash collections by sunrise/sunset, with bundled fallback. */
(function (global) {
  'use strict';

  var COLLECTIONS = {
    morning: 'GD4aOSg4yQE',
    day: 'o8uX55RbBPs',
    evening: '3M2rKTckZaQ',
    night: 'bHDh4Ae7O8o'
  };
  var ROTATE_MIN = 30;
  var HOUR_MS = 60 * 60 * 1000;
  var shown = null, nextPhoto = null, fetching = false, sun = { sunrise: null, sunset: null };
  var rotateTimer = 0, preloadTimer = 0, token = 0, creditInfo = null, remoteActive = false, lastStatus = '';

  function accessKey() {
    var runtime = global.CleanFrameRuntime;
    return runtime && typeof runtime.unsplashAccessKey === 'string' ? runtime.unsplashAccessKey : '';
  }

  function period(now, sunrise, sunset) {
    var t = (now || new Date()).getTime(), rise, set;
    if (!sunrise || !sunset) {
      return global.CleanFrameHero ? global.CleanFrameHero.partOfDay(now) === 'morning' ? 'morning'
        : global.CleanFrameHero.partOfDay(now) === 'afternoon' ? 'day'
        : global.CleanFrameHero.partOfDay(now) === 'evening' ? 'evening' : 'night' : 'day';
    }
    rise = sunrise.getTime();
    set = sunset.getTime();
    if (t >= rise - HOUR_MS && t < rise + HOUR_MS) return 'morning';
    if (t >= set - HOUR_MS && t < set + HOUR_MS) return 'evening';
    if (t >= rise + HOUR_MS && t < set - HOUR_MS) return 'day';
    return 'night';
  }

  function collectionId(name) { return COLLECTIONS[name] || COLLECTIONS.day; }

  function photoUrl(photo) {
    if (!photo || !photo.urls) return '';
    if (photo.urls.raw) return photo.urls.raw + '&w=960&h=540&fit=crop&crop=entropy&q=68';
    return photo.urls.small || photo.urls.regular || '';
  }

  function creditFrom(photo) {
    if (!photo || !photo.user) return null;
    return { name: photo.user.name || photo.user.username || 'Unknown' };
  }

  function downloadLocation(photo) {
    return photo && photo.links && photo.links.download_location || '';
  }

  function getJson(url, key, done) {
    var xhr = new XMLHttpRequest(), finished = false;
    xhr.open('GET', url, true);
    xhr.timeout = 10000;
    xhr.setRequestHeader('Authorization', 'Client-ID ' + key);
    xhr.onload = function () {
      if (finished) return;
      finished = true;
      lastStatus = 'HTTP ' + xhr.status;
      if (xhr.status < 200 || xhr.status >= 300) { done({ message: lastStatus }); return; }
      try { done(null, JSON.parse(xhr.responseText)); }
      catch (err) { lastStatus = 'bad json'; done({ message: 'bad json' }); }
    };
    xhr.onerror = xhr.ontimeout = function () { if (finished) return; finished = true; lastStatus = 'network'; done({ message: 'network' }); };
    try { xhr.send(); } catch (err) { lastStatus = 'send'; done({ message: 'network' }); }
  }

  function pingDownload(url, key) {
    var xhr;
    if (!url || !key) return;
    xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 8000;
    xhr.setRequestHeader('Authorization', 'Client-ID ' + key);
    try { xhr.send(); } catch (err) { /* Attribution ping is best-effort. */ }
  }

  function loadImage(src, done) {
    var im = new Image();
    im.onload = function () { done(im.naturalWidth ? im : null); };
    im.onerror = function () { done(null); };
    im.src = src;
  }

  function photoEl() { return document.getElementById('photo'); }

  function applyImage(im, photo) {
    var el = photoEl();
    if (!el || !im) return;
    el.src = im.src;
    shown = { image: im, photo: photo };
    creditInfo = creditFrom(photo);
    remoteActive = true;
    pingDownload(downloadLocation(photo), accessKey());
    if (typeof global.CleanFrameDaylight.onCredit === 'function') global.CleanFrameDaylight.onCredit(creditInfo);
  }

  function fetchPhoto(done) {
    var key = accessKey(), name, url;
    if (!key) { done(null); return; }
    name = period(new Date(), sun.sunrise, sun.sunset);
    url = 'https://api.unsplash.com/photos/random?collections=' + encodeURIComponent(collectionId(name)) + '&orientation=landscape';
    getJson(url, key, function (err, data) {
      var src;
      if (err || !data) { done(null); return; }
      src = photoUrl(data);
      if (!src) { done(null); return; }
      loadImage(src, function (im) { done(im ? { image: im, photo: data } : null); });
    });
  }

  function showFetched(entry) {
    if (!entry) return false;
    applyImage(entry.image, entry.photo);
    return true;
  }

  function rotate() {
    var n;
    if (nextPhoto) {
      n = ++token;
      showFetched(nextPhoto);
      nextPhoto = null;
      preloadSoon();
      schedule();
      return;
    }
    if (fetching) { schedule(); return; }
    n = ++token;
    fetching = true;
    fetchPhoto(function (entry) {
      fetching = false;
      if (n !== token) return;
      if (entry) showFetched(entry);
      preloadSoon();
      schedule();
    });
  }

  function preloadSoon() {
    clearTimeout(preloadTimer);
    preloadTimer = setTimeout(function () {
      if (nextPhoto || fetching || !accessKey()) return;
      fetching = true;
      fetchPhoto(function (entry) {
        fetching = false;
        nextPhoto = entry;
      });
    }, 4000);
  }

  function minuteMs() {
    return global.ShoreQA && global.ShoreQA.minuteMs ? global.ShoreQA.minuteMs : 60000;
  }

  function schedule() {
    clearTimeout(rotateTimer);
    if (!accessKey() || document.hidden) return;
    rotateTimer = setTimeout(rotate, ROTATE_MIN * minuteMs());
  }

  function start() {
    if (!accessKey()) return;
    rotate();
  }

  function setSun(sunrise, sunset) {
    var changed = (sunrise && sunrise.getTime()) !== (sun.sunrise && sun.sunrise.getTime())
      || (sunset && sunset.getTime()) !== (sun.sunset && sun.sunset.getTime());
    sun.sunrise = sunrise || null;
    sun.sunset = sunset || null;
    if (changed && accessKey() && !shown && !fetching) rotate();
  }

  function reapply() {
    var el = photoEl();
    if (!remoteActive || !shown || !el) return;
    if (el.src !== shown.image.src) el.src = shown.image.src;
  }

  function pause() { clearTimeout(rotateTimer); rotateTimer = 0; }
  function resume() { if (accessKey()) schedule(); }

  function credit() { return remoteActive ? creditInfo : null; }

  global.CleanFrameDaylight = {
    COLLECTIONS: COLLECTIONS,
    period: period,
    collectionId: collectionId,
    photoUrl: photoUrl,
    creditFrom: creditFrom,
    start: start,
    setSun: setSun,
    reapply: reapply,
    pause: pause,
    resume: resume,
    credit: credit,
    onCredit: null,
    state: function () {
      return {
        remote: remoteActive,
        period: period(new Date(), sun.sunrise, sun.sunset),
        hasKey: !!accessKey(),
        credit: credit(),
        lastStatus: lastStatus
      };
    }
  };
})(window);
