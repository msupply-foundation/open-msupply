import { describe, expect, it } from 'vitest';
import {
  backdateBounds,
  backdateWarnings,
  backdatedDatetimeFor,
  backdatingGate,
  withinBackdateBounds,
} from './backdating';
import { dateToIsoDate } from '../../../ui/elements/inputs/dateTimeConvert';

describe('backdatingGate (OMS-REG-DIST-04.23)', () => {
  it('is enabled while NEW with the preference on and the panel editable', () => {
    expect(
      backdatingGate({
        status: 'NEW',
        shipmentsEnabled: true,
        panelDisabled: false,
      })
    ).toEqual({ enabled: true });
  });

  it('is disabled with the "not enabled" reason when the preference is off', () => {
    expect(
      backdatingGate({
        status: 'NEW',
        shipmentsEnabled: false,
        panelDisabled: false,
      })
    ).toEqual({
      enabled: false,
      reasonKey: 'messages.received-date-backdating-not-enabled',
    });
  });

  it('is disabled with the "only new" reason past NEW (preference on, still editable)', () => {
    for (const status of ['ALLOCATED', 'PICKED']) {
      expect(
        backdatingGate({ status, shipmentsEnabled: true, panelDisabled: false })
      ).toEqual({ enabled: false, reasonKey: 'messages.picked-date-not-new' });
    }
  });

  it('is disabled with NO specific reason when the panel is read-only (SHIPPED onward)', () => {
    expect(
      backdatingGate({
        status: 'SHIPPED',
        shipmentsEnabled: true,
        panelDisabled: true,
      })
    ).toEqual({ enabled: false });
  });
});

describe('backdateBounds (OMS-REG-DIST-04.23 picker window)', () => {
  it("bounds the picker to [now − (maxDays − 1), now] — the old app's +1 buffer for the server UTC boundary check", () => {
    expect(backdateBounds(new Date(2026, 6, 22, 12, 0, 0), 30)).toEqual({
      min: '2026-06-23',
      max: '2026-07-22',
    });
  });

  it('a maximum of 0 (or unset) means NO lower bound — unlimited backdating, never "today only"', () => {
    const b = backdateBounds(new Date(2026, 6, 22, 12, 0, 0), 0);
    expect(b.min).toBeUndefined();
    expect(b.max).toBe('2026-07-22');
  });

  it('maxDays 1 collapses to today only', () => {
    const b = backdateBounds(new Date(2026, 6, 22, 12, 0, 0), 1);
    expect(b.min).toBe('2026-07-22');
    expect(b.max).toBe('2026-07-22');
  });
});

describe('withinBackdateBounds (OMS-REG-DIST-04.23 save-path rejection)', () => {
  const bounds = { min: '2026-06-22', max: '2026-07-22' };

  it('accepts a day inside the window, including both edges', () => {
    expect(withinBackdateBounds(bounds, '2026-07-01')).toBe(true);
    expect(withinBackdateBounds(bounds, '2026-06-22')).toBe(true);
    expect(withinBackdateBounds(bounds, '2026-07-22')).toBe(true);
  });

  it('rejects a future day (beyond max)', () => {
    expect(withinBackdateBounds(bounds, '2026-07-23')).toBe(false);
    expect(withinBackdateBounds(bounds, '2027-01-01')).toBe(false);
  });

  it('rejects a day before the maximum-backdate window', () => {
    expect(withinBackdateBounds(bounds, '2026-06-21')).toBe(false);
    expect(withinBackdateBounds(bounds, '2025-12-31')).toBe(false);
  });

  it('rejects an empty value (a cleared input)', () => {
    expect(withinBackdateBounds(bounds, '')).toBe(false);
  });

  it('a window with no lower bound accepts any past day, still rejecting the future', () => {
    const unbounded = { max: '2026-07-22' };
    expect(withinBackdateBounds(unbounded, '1999-01-01')).toBe(true);
    expect(withinBackdateBounds(unbounded, '2026-07-22')).toBe(true);
    expect(withinBackdateBounds(unbounded, '2026-07-23')).toBe(false);
  });
});

describe('backdatedDatetimeFor', () => {
  const now = new Date(2026, 6, 22, 9, 30, 0);

  it('a backdated day is stamped at its LOCAL end-of-day (UTC instant)', () => {
    const iso = backdatedDatetimeFor(now, '2026-07-15');
    expect(iso).toBe(new Date(2026, 6, 15, 23, 59, 59, 999).toISOString());
    // Round-trips to the chosen local day, whatever the device zone.
    expect(dateToIsoDate(new Date(iso))).toBe('2026-07-15');
  });

  it('today keeps the actual current moment (not backdated)', () => {
    expect(backdatedDatetimeFor(now, '2026-07-22')).toBe(now.toISOString());
  });
});

describe('backdateWarnings (OMS-REG-DIST-04.24/.27)', () => {
  it('warns about line removal when the shipment has lines', () => {
    expect(
      backdateWarnings({ hasLines: true, stocktakeConflict: false })
    ).toEqual(['messages.confirm-backdate-picked-date']);
  });

  it('warns about a stocktake conflict when one applies', () => {
    expect(
      backdateWarnings({ hasLines: false, stocktakeConflict: true })
    ).toEqual(['messages.stocktake-after-backdate-warning']);
  });

  it('shows both warnings (removal first) when both apply', () => {
    expect(
      backdateWarnings({ hasLines: true, stocktakeConflict: true })
    ).toEqual([
      'messages.confirm-backdate-picked-date',
      'messages.stocktake-after-backdate-warning',
    ]);
  });

  it('warns about nothing (apply directly) when there are no lines and no conflict', () => {
    expect(
      backdateWarnings({ hasLines: false, stocktakeConflict: false })
    ).toEqual([]);
  });
});
