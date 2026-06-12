import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addEvent, removeEvent, getEvents, clearEvents } from '../../src/js/event-markers.mjs';

describe('event markers logic', () => {
  it('addEvent creates an event with id, date, name', () => {
    clearEvents();
    const ev = addEvent('2020-01-01', '코로나19 확산');
    assert.ok(ev.id);
    assert.equal(ev.date, '2020-01-01');
    assert.equal(ev.name, '코로나19 확산');
  });

  it('getEvents returns all added events sorted by date', () => {
    clearEvents();
    addEvent('2022-03-09', '대선');
    addEvent('2020-04-15', '총선');
    const events = getEvents();
    assert.equal(events.length, 2);
    assert.equal(events[0].date, '2020-04-15');
    assert.equal(events[1].date, '2022-03-09');
  });

  it('removeEvent deletes by id', () => {
    clearEvents();
    const ev = addEvent('2021-04-07', '재보선');
    removeEvent(ev.id);
    assert.equal(getEvents().length, 0);
  });
});
