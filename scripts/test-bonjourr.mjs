// Offline unit checks for the Bonjourr Home overlay. No TV or network.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
function load(name) {
  const window = {};
  vm.runInNewContext(readFileSync(join(root, name), 'utf8'), { window, Date, XMLHttpRequest: function () {}, Image: function () {}, document: { hidden: false, getElementById: () => null } });
  return window;
}

test('24-hour clock, date and greeting follow Belgrade-style copy', () => {
  const { CleanFrameHero: hero } = load('app/hero.js');
  assert.equal(hero.clockText(new Date(2026, 10, 8, 1, 17)), '01:17');
  assert.equal(hero.clockText(new Date(2026, 10, 8, 14, 5)), '14:05');
  assert.equal(hero.dateText(new Date(2026, 10, 8, 1, 17)), 'Sunday, November 8');
  assert.equal(hero.greeting(new Date(2026, 10, 8, 7, 0)), 'Good morning, Petar');
  assert.equal(hero.greeting(new Date(2026, 10, 8, 13, 0)), 'Good afternoon, Petar');
  assert.equal(hero.greeting(new Date(2026, 10, 8, 19, 0)), 'Good evening, Petar');
  assert.equal(hero.greeting(new Date(2026, 10, 8, 1, 17)), 'Good night, Petar');
});

test('Open-Meteo forecast becomes the Bonjourr weather sentence', () => {
  const { CleanFrameWeather: weather } = load('app/weather.js');
  const parsed = weather.parseForecast({
    current: { temperature_2m: 2.4, weather_code: 0, is_day: 0 },
    daily: { temperature_2m_max: [12.2], sunrise: ['2026-11-08T06:32'], sunset: ['2026-11-08T16:18'] }
  });
  assert.equal(parsed.line, 'Clear. It is currently 2° with a high of 12° today.');
  assert.equal(parsed.tempLabel, '2°');
  assert.equal(weather.describe(3), 'Overcast');
  assert.equal(weather.iconKind(0, false), 'moon');
  assert.equal(weather.iconKind(61, true), 'rain');
});

test('Daylight collections follow the two-hour sunrise and sunset windows', () => {
  const window = load('app/hero.js');
  vm.runInNewContext(readFileSync(join(root, 'app/daylight.js'), 'utf8'), {
    window, Date, XMLHttpRequest: function () {}, Image: function () {},
    document: { hidden: false, getElementById: () => null }
  });
  const daylight = window.CleanFrameDaylight;
  const sunrise = new Date(2026, 10, 8, 6, 32);
  const sunset = new Date(2026, 10, 8, 16, 18);
  assert.equal(daylight.period(new Date(2026, 10, 8, 6, 40), sunrise, sunset), 'morning');
  assert.equal(daylight.period(new Date(2026, 10, 8, 12, 0), sunrise, sunset), 'day');
  assert.equal(daylight.period(new Date(2026, 10, 8, 16, 0), sunrise, sunset), 'evening');
  assert.equal(daylight.period(new Date(2026, 10, 8, 22, 0), sunrise, sunset), 'night');
  assert.equal(daylight.collectionId('morning'), 'GD4aOSg4yQE');
  assert.equal(daylight.collectionId('day'), 'o8uX55RbBPs');
  assert.equal(daylight.collectionId('evening'), '3M2rKTckZaQ');
  assert.equal(daylight.collectionId('night'), 'bHDh4Ae7O8o');
  assert.match(daylight.photoUrl({ urls: { raw: 'https://images.unsplash.com/photo?ixid=1' } }), /w=960/);
  assert.equal(daylight.creditFrom({ user: { name: 'Ada' } }).name, 'Ada');
});
