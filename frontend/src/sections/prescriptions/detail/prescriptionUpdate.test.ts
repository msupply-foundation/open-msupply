import { describe, expect, it } from 'vitest';
import {
  localTodayIso,
  utcToLocalDay,
} from '../../../ui/elements/inputs/dateTimeConvert';
import {
  newPrescriptionDate,
  prescriptionDateInstant,
} from './prescriptionUpdate';

// The write-side date conversion for the prescription date (#456). A PAST day
// is widened to its inclusive end-of-day instant, exactly as the reference
// client does — `Formatter.toIsoString(endOfDay(day))`, i.e. the local day at
// 23:59:59.999 serialized with `.toISOString()`. TODAY is the exception
// (#1211): it keeps the current moment, because the widened instant would be
// in the future and the server silently drops those. Expected instants are
// built with the local Date constructor so every assertion holds in any device
// timezone the suite runs in.

/** The instant the pre-#1211 conversion would have sent for a given day. */
const localDayEnd = (isoDay: string): string => {
  const [y, m, d] = isoDay.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
};

describe('prescriptionDateInstant', () => {
  it('widens a PAST picked local day to its inclusive end-of-day UTC instant', () => {
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

  // #1211: end-of-day TODAY is always in the future, and the server drops a
  // future prescription date — it clears `backdatedDatetime` rather than
  // storing it, so the date falls back to `createdDatetime` and a prescription
  // created on an earlier day can never be dated today. The wire instant must
  // therefore never be in the future.
  it('sends the CURRENT MOMENT for today, not its end-of-day (#1211)', () => {
    const before = Date.now();
    const iso = prescriptionDateInstant(localTodayIso());
    const after = Date.now();

    const sent = Date.parse(iso);
    expect(sent).toBeGreaterThanOrEqual(before);
    expect(sent).toBeLessThanOrEqual(after);
    // Not the widened instant the other days get.
    expect(iso).not.toBe(localDayEnd(localTodayIso()));
  });

  it('still reads back as today, so the field shows the day that was picked', () => {
    expect(utcToLocalDay(prescriptionDateInstant(localTodayIso()))).toBe(
      localTodayIso()
    );
  });
});

// The CREATE side of the same rule (#1215 review). Editing must always send a
// date — omitting it leaves the stored one untouched — but creation must send
// NOTHING for today: any non-null `backdatedDatetime` pins the new prescription
// to that instant, and the item editor then offers historical stock, dropping
// batches that had no availability then. Stock received after the prescription
// was created would be undispensable on it.
describe('newPrescriptionDate', () => {
  it('sends NOTHING for today — today means "not backdated"', () => {
    expect(newPrescriptionDate(localTodayIso())).toBeUndefined();
  });

  it('sends the end-of-day instant for an EARLIER day, as the edit path does', () => {
    expect(newPrescriptionDate('2026-07-15')).toBe(
      prescriptionDateInstant('2026-07-15')
    );
    expect(newPrescriptionDate('2026-07-15')).toBe(localDayEnd('2026-07-15'));
  });
});
