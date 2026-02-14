import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { __test } from '../../api/tech-events.js';

test('normalizeLocation keeps ambiguous cities country-aware', () => {
  const uk = __test.normalizeLocation('Cambridge, UK');
  const us = __test.normalizeLocation('Cambridge, MA');

  assert.ok(uk);
  assert.ok(us);
  assert.equal(uk.country, 'UK');
  assert.equal(us.country, 'USA');
  assert.notEqual(uk.lat, us.lat);
  assert.notEqual(uk.lng, us.lng);
});

test('parseICS extracts coordinates and sorts by start date', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:event-b',
    'SUMMARY:Conference B',
    'LOCATION:London, UK',
    'DTSTART;VALUE=DATE:20270102',
    'DTEND;VALUE=DATE:20270103',
    'URL:https://example.com/b',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:event-a',
    'SUMMARY:Conference A',
    'LOCATION:Cambridge, MA',
    'DTSTART;VALUE=DATE:20270101',
    'DTEND;VALUE=DATE:20270101',
    'URL:https://example.com/a',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');

  const events = __test.parseICS(ics);
  assert.equal(events.length, 2);
  assert.equal(events[0].id, 'event-a');
  assert.equal(events[1].id, 'event-b');
  assert.equal(events[0].coords.country, 'USA');
  assert.equal(events[1].coords.country, 'UK');
});

test('parseDevEventsRSS parses future online events as virtual', () => {
  const rss = [
    '<rss><channel>',
    '<item>',
    '<title><![CDATA[Future Online Summit]]></title>',
    '<link>https://example.com/online</link>',
    '<description><![CDATA[Future Online Summit is happening on January 1, 2099. Online event for developers.]]></description>',
    '<guid>future-online</guid>',
    '</item>',
    '</channel></rss>',
  ].join('');

  const events = __test.parseDevEventsRSS(rss);
  assert.equal(events.length, 1);
  assert.equal(events[0].id, 'future-online');
  assert.equal(events[0].location, 'Online');
  assert.equal(events[0].coords.virtual, true);
});

test('handler rejects non-GET methods with standard error contract', async () => {
  const response = await handler({ method: 'POST', url: 'https://example.com/api/tech-events' });
  assert.equal(response.status, 405);
  const body = await response.json();
  assert.equal(body.error, 'Method not allowed');
  assert.equal(body.code, 'method_not_allowed');
});

test('handler answers preflight OPTIONS with 204', async () => {
  const response = await handler({ method: 'OPTIONS', url: 'https://example.com/api/tech-events' });
  assert.equal(response.status, 204);
});
