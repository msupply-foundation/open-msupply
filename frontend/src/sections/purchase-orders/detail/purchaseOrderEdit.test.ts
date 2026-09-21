import { describe, expect, it } from 'vitest';
import { sentDayToWire, sentWireToDay } from './purchaseOrderEdit';

// The sent moment's wire shape (contract ⚠️ the sent moment is written naive
// and read zoned): a DateTime the panel treats as a day. Written as a naive
// UTC midnight — the server rejects any zone suffix — and read back as its UTC
// day, so a pick round-trips to the same day.
describe('the sent moment as a day', () => {
  it('writes a picked day as naive UTC midnight', () => {
    expect(sentDayToWire('2024-01-20')).toBe('2024-01-20T00:00:00');
  });

  it('reads the zoned value the node returns back as its day', () => {
    expect(sentWireToDay('2024-01-20T00:00:00+00:00')).toBe('2024-01-20');
    expect(sentWireToDay('2026-09-21T10:25:59.339742+00:00')).toBe(
      '2026-09-21'
    );
  });

  it('reads an absent moment as no day', () => {
    expect(sentWireToDay(null)).toBeUndefined();
  });
});
