import { describe, expect, it } from 'vitest';
import {
  backdateBounds,
  backdateWarnings,
  backdatedDatetimeFor,
  backdatingGate,
  toDateInput,
} from './backdating';

describe('backdatingGate (AC-B1)', () => {
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
    ).toEqual({ enabled: false, reasonKey: 'messages.backdating-not-enabled' });
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

describe('toDateInput', () => {
  it('formats a local date as zero-padded YYYY-MM-DD', () => {
    expect(toDateInput(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05');
    expect(toDateInput(new Date(2026, 6, 22, 9, 30, 0))).toBe('2026-07-22');
  });
});

describe('backdateBounds (AC-B1 picker window)', () => {
  it('bounds the picker to [now − maxDays, now]', () => {
    expect(backdateBounds(new Date(2026, 6, 22, 12, 0, 0), 30)).toEqual({
      min: '2026-06-22',
      max: '2026-07-22',
    });
  });

  it('collapses to a single day when maxDays is 0', () => {
    const b = backdateBounds(new Date(2026, 6, 22, 12, 0, 0), 0);
    expect(b.min).toBe('2026-07-22');
    expect(b.max).toBe('2026-07-22');
  });
});

describe('backdatedDatetimeFor', () => {
  it('produces an ISO datetime whose local day is the chosen day', () => {
    const iso = backdatedDatetimeFor(
      new Date(2026, 6, 22, 9, 30, 0),
      '2026-07-15'
    );
    expect(toDateInput(new Date(iso))).toBe('2026-07-15');
    expect(() => new Date(iso).toISOString()).not.toThrow();
  });
});

describe('backdateWarnings (AC-B2/B4)', () => {
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
