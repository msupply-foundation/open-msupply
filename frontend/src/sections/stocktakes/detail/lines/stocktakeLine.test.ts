import { describe, expect, it } from 'vitest';
import { isUncounted, lineDifference, type CountLine } from './stocktakeLine';

// Anchors: spec/stocktakes/cases/OMS-REG-INV-03.
//   .49 — displayed difference = counted − snapshot (blank while uncounted)
//   .68 — an uncounted line reads in the info tone; any count (incl. 0) default
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
