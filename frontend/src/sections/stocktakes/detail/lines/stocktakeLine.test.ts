import { describe, expect, it } from 'vitest';
import {
  defaultedPackSize,
  isUncounted,
  lineDifference,
  packSizeEditable,
  type CountLine,
} from './stocktakeLine';

// Anchors: spec/stocktakes/cases/OMS-REG-INV-03.
//   .49 — displayed difference = counted − snapshot (blank while uncounted)
//   .68 — an uncounted line reads in the info tone; any count (incl. 0) default
//   .15 — pack size editable only on a batch with no stock line behind it
//   .79/.80 — an editable batch's pack size defaults to the item's default
// Pure count arithmetic — the cheapest layer to pin the exact rule; the detail
// table's rendering of it (the actual info-tone class, the blank cell) is
// exercised in the e2e suite.

const line = (over: Partial<CountLine> = {}): CountLine => ({
  snapshotNumberOfPacks: 10,
  countedNumberOfPacks: null,
  ...over,
});

describe('OMS-REG-INV-03.68 — uncounted predicate (row tone)', () => {
  it('treats a null counted value as uncounted', () => {
    expect(isUncounted(line({ countedNumberOfPacks: null }))).toBe(true);
  });

  it('treats a zero count as counted — a deliberate zero is a real count', () => {
    expect(isUncounted(line({ countedNumberOfPacks: 0 }))).toBe(false);
  });

  it('treats any positive count as counted', () => {
    expect(isUncounted(line({ countedNumberOfPacks: 7 }))).toBe(false);
  });
});

describe('OMS-REG-INV-03.49 — difference = counted − snapshot', () => {
  it('is null (blank) while the line is uncounted', () => {
    expect(lineDifference(line({ countedNumberOfPacks: null }))).toBeNull();
  });

  it('is a positive delta for an increase', () => {
    expect(
      lineDifference({ snapshotNumberOfPacks: 10, countedNumberOfPacks: 13 })
    ).toBe(3);
  });

  it('is a negative delta for a decrease', () => {
    expect(
      lineDifference({ snapshotNumberOfPacks: 10, countedNumberOfPacks: 4 })
    ).toBe(-6);
  });

  it('is 0 when counted equals snapshot (counted, no variance)', () => {
    expect(
      lineDifference({ snapshotNumberOfPacks: 10, countedNumberOfPacks: 10 })
    ).toBe(0);
  });

  it('treats a missing snapshot as 0 — a new batch shows its full counted quantity', () => {
    expect(
      lineDifference({ snapshotNumberOfPacks: null, countedNumberOfPacks: 5 })
    ).toBe(5);
  });
});

describe('OMS-REG-INV-03.15 — pack size editable only with no stock behind the batch', () => {
  it('is editable on a batch with no stock line — a fresh batch or a zero-stock generated line', () => {
    expect(packSizeEditable({ stockLine: null })).toBe(true);
    expect(packSizeEditable({})).toBe(true);
  });

  it('is read-only on a batch backed by a stock line', () => {
    expect(packSizeEditable({ stockLine: { id: 'stock-1' } })).toBe(false);
  });
});

describe('OMS-REG-INV-03.79/.80 — editable pack size defaults to the item default', () => {
  it('keeps a pack size the line already has', () => {
    expect(defaultedPackSize({ defaultPackSize: 12 }, 5)).toBe(5);
  });

  it('fills an empty pack size with the item default (.79 new batch, .80 zero-stock line)', () => {
    expect(defaultedPackSize({ defaultPackSize: 12 }, null)).toBe(12);
    expect(defaultedPackSize({ defaultPackSize: 12 })).toBe(12);
  });

  it('floors an unconfigured item default to 1 — never seeds the 0/empty finalise rejects', () => {
    expect(defaultedPackSize({ defaultPackSize: 0 }, null)).toBe(1);
    expect(defaultedPackSize({ defaultPackSize: -3 }, null)).toBe(1);
  });

  it('keeps a deliberate fractional or small pack size untouched', () => {
    expect(defaultedPackSize({ defaultPackSize: 12 }, 0.5)).toBe(0.5);
  });
});
