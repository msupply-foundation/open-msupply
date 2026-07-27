import { describe, expect, it } from 'vitest';
import { utcToLocalDay } from '../../../ui/elements/inputs/dateTimeConvert';
import { prescriptionDateInstant } from './prescriptionUpdate';

// The write-side date conversion for the prescription date (#456). The picked
// LOCAL calendar day is widened to its inclusive end-of-day instant, exactly
// as the reference client does — `Formatter.toIsoString(endOfDay(day))`, i.e.
// the local day at 23:59:59.999 serialized with `.toISOString()`. Expected
// instants are built with the local Date constructor so every assertion holds
// in any device timezone the suite runs in.

describe('prescriptionDateInstant', () => {
  it('widens the picked local day to its inclusive end-of-day UTC instant', () => {
    expect(prescriptionDateInstant('2026-07-15')).toBe(
      new Date(2026, 6, 15, 23, 59, 59, 999).toISOString()
    );
  });

  it('produces a byte-identical string to the reference client — endOfDay(day).toISOString(), millis and all', () => {
    // OMS: Formatter.toIsoString(DateUtils.endOfDayOrNull(day)). endOfDay sets
    // LOCAL time to 23:59:59.999; toIsoString is `.toISOString()`. Both sides
    // widen the SAME local day and serialize the same way → byte-identical.
    const day = '2026-01-01';
    const oms = (() => {
      const d = new Date(2026, 0, 1);
      d.setHours(23, 59, 59, 999);
      return d.toISOString();
    })();
    expect(prescriptionDateInstant(day)).toBe(oms);
  });

  it('round-trips through utcToLocalDay to the picked day, across a year boundary', () => {
    expect(utcToLocalDay(prescriptionDateInstant('2026-07-15'))).toBe(
      '2026-07-15'
    );
    // Widened end-of-day is the instant most likely to cross the date line off
    // UTC — it must still read back as the day the user picked.
    expect(utcToLocalDay(prescriptionDateInstant('2025-12-31'))).toBe(
      '2025-12-31'
    );
  });
});
