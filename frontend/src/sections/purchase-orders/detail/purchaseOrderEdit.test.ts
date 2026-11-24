import { describe, expect, it } from 'vitest';
import { sentDayToWire, sentWireToDay } from './purchaseOrderEdit';

// The sent moment's wire shape (contract ⚠️ the sent moment is written naive
// and read zoned): a DateTime the panel treats as a day. Read as the LOCAL day
// it falls on, so a moment the service stamps on entry to Sent shows the same
// day as the list's Sent column (OMS-FUN-PO-04.35, #2614). Written as the
// picked day's local midnight, naive UTC — the server rejects any zone suffix —
// so a pick round-trips to the same day. Built from local components, so each
// assertion holds in whatever zone the suite runs (vitest.config.ts).

// What the node hands back: the instant in UTC with a `+00:00` suffix.
const asNodeReturnsIt = (d: Date): string =>
  d.toISOString().replace('Z', '+00:00');

describe('the sent moment as a day', () => {
  it('writes a picked day as its local midnight, naive UTC', () => {
    const wire = sentDayToWire('2024-01-20');
    expect(wire).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    expect(new Date(`${wire}Z`).getTime()).toBe(
      new Date(2024, 0, 20).getTime()
    );
  });

  it('reads a picked day back as the same day', () => {
    expect(sentWireToDay(`${sentDayToWire('2024-01-20')}+00:00`)).toBe(
      '2024-01-20'
    );
  });

  it('reads a stamped moment as the local day it falls on, at either end of the day', () => {
    // Off UTC, one of the two falls on a different UTC day: early morning
    // east of Greenwich (the store that sends at 10am in New Zealand), late
    // evening west of it.
    expect(sentWireToDay(asNodeReturnsIt(new Date(2026, 10, 24, 0, 30)))).toBe(
      '2026-11-24'
    );
    expect(sentWireToDay(asNodeReturnsIt(new Date(2026, 10, 24, 23, 30)))).toBe(
      '2026-11-24'
    );
  });

  it('reads an absent moment as no day', () => {
    expect(sentWireToDay(null)).toBeUndefined();
  });
});
