import { describe, expect, it } from 'vitest';
import {
  awaitingReason,
  compareBatchOrder,
  defaultedPackSize,
  differenceSize,
  isUncounted,
  lineDifference,
  packSizeEditable,
  type CountLine,
  type ReasonRequirement,
} from './stocktakeLine';

// Anchors: spec/stocktakes/cases/OMS-REG-INV-03.
//   .49 — displayed difference = counted − snapshot (blank while uncounted)
//   .68 — an uncounted line takes the unfinished-work marking (tint + leading
//         bar) and reads "Not counted"; any count (incl. 0) is an ordinary row
//   .15 — pack size editable only on a batch with no stock line behind it
//   .79/.80 — an editable batch's pack size defaults to the item's default
//   .85 — the editor states a difference's size at 2 dp, and a nonzero one
//         finer than that is marked rather than rounded away to 0
//   .86 — a line awaits a reason while its count is off the snapshot in a
//         direction that demands one and it holds none (.56/.57/.70 → none)
//   .91 — the editor lists an item's batches soonest expiry first, then by
//         batch name (numbers as numbers), missing values last
// Pure count arithmetic — the cheapest layer to pin the exact rule; the detail
// table's rendering of it (the tint/accent attributes, the absent-value word)
// is exercised in the e2e suite.

const line = (over: Partial<CountLine> = {}): CountLine => ({
  snapshotNumberOfPacks: 10,
  countedNumberOfPacks: null,
  ...over,
});

describe('OMS-REG-INV-03.68 — uncounted predicate (row marking)', () => {
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

describe('OMS-REG-INV-03.85 — the difference size the editor states', () => {
  it('rounds to the 2 dp a count is entered to, dropping float noise', () => {
    expect(differenceSize(2.3 - 5)).toEqual({
      packs: 2.7,
      belowPrecision: false,
    });
    expect(differenceSize(3)).toEqual({ packs: 3, belowPrecision: false });
  });

  it('marks a nonzero difference finer than 0.01 instead of reading 0', () => {
    // A part-pack snapshot (one unit out of a pack of 3) counted to its 2-dp
    // display, and float noise in the stock totals — both still need a reason.
    expect(differenceSize(9.67 - 29 / 3)).toEqual({
      packs: 0,
      belowPrecision: true,
    });
    expect(differenceSize(0.3 - (0.1 + 0.2))).toEqual({
      packs: 0,
      belowPrecision: true,
    });
  });

  it('a level line is plain 0, not below precision', () => {
    expect(differenceSize(0)).toEqual({ packs: 0, belowPrecision: false });
  });
});

describe('OMS-REG-INV-03.86 — a line awaits a reason', () => {
  const both: ReasonRequirement = { positive: true, negative: true };
  const counted = (countedNumberOfPacks: number | null, reason = false) => ({
    snapshotNumberOfPacks: 10,
    countedNumberOfPacks,
    reasonOption: reason ? { id: 'reason-1' } : null,
  });

  it('awaits one as soon as the count moves off the snapshot, either way', () => {
    expect(awaitingReason(counted(7), both)).toBe(true);
    expect(awaitingReason(counted(12), both)).toBe(true);
  });

  it('never awaits one on a level or uncounted line', () => {
    expect(awaitingReason(counted(10), both)).toBe(false);
    expect(awaitingReason(counted(null), both)).toBe(false);
  });

  it('stops awaiting once a reason is chosen', () => {
    expect(awaitingReason(counted(7, true), both)).toBe(false);
  });

  it('follows the direction — only a direction that demands a reason marks (.56)', () => {
    const negativeOnly: ReasonRequirement = { positive: false, negative: true };
    expect(awaitingReason(counted(7), negativeOnly)).toBe(true);
    expect(awaitingReason(counted(12), negativeOnly)).toBe(false);
  });

  it('never marks when nothing is required — initial (.57) or blind (.70) stocktake', () => {
    const none: ReasonRequirement = { positive: false, negative: false };
    expect(awaitingReason(counted(7), none)).toBe(false);
    expect(awaitingReason(counted(12), none)).toBe(false);
  });

  it('treats a missing snapshot as 0 — a new batch counted up awaits a positive reason', () => {
    expect(
      awaitingReason(
        { snapshotNumberOfPacks: null, countedNumberOfPacks: 5 },
        { positive: true, negative: false }
      )
    ).toBe(true);
  });
});

describe('OMS-REG-INV-03.91 — the editor lists batches soonest expiry first, then by batch', () => {
  type Batch = {
    id?: string;
    stockLineId?: string;
    expiryDate: string | null;
    batch: string | null;
    location?: { code: string } | null;
    packSize?: number | null;
  };
  // Every row carries an id, the order's last resort; a placeholder where a
  // test's rows already differ earlier in the order.
  const sorted = (batches: Batch[]) =>
    batches
      .map((b, i) => ({ ...b, id: b.id ?? `row-${i}` }))
      .sort(compareBatchOrder);
  const order = (batches: Batch[]) => sorted(batches).map(b => b.batch);

  it('puts the soonest expiry first, whatever the batch names', () => {
    expect(
      order([
        { expiryDate: '2027-06-30', batch: '001' },
        { expiryDate: '2026-12-31', batch: '003' },
        { expiryDate: '2027-01-31', batch: '002' },
      ])
    ).toEqual(['003', '002', '001']);
  });

  it('orders batches sharing an expiry by name, digit runs as numbers', () => {
    expect(
      order([
        { expiryDate: '2027-01-31', batch: 'B10' },
        { expiryDate: '2027-01-31', batch: 'B2' },
        { expiryDate: '2027-01-31', batch: 'A9' },
      ])
    ).toEqual(['A9', 'B2', 'B10']);
  });

  it('puts a batch with no expiry after every dated one, ordered by name among themselves', () => {
    expect(
      order([
        { expiryDate: null, batch: 'Z' },
        { expiryDate: null, batch: 'A' },
        { expiryDate: '2030-01-01', batch: 'M' },
      ])
    ).toEqual(['M', 'A', 'Z']);
  });

  it('puts an unnamed batch after the named ones sharing its expiry', () => {
    expect(
      order([
        { expiryDate: '2027-01-31', batch: null },
        { expiryDate: '2027-01-31', batch: '' },
        { expiryDate: '2027-01-31', batch: '001' },
      ])
    ).toEqual(['001', null, '']);
  });

  // The tie-breakers: a batch split across locations or pack sizes, or two
  // blank batches, must still load in one fixed order — a tie left to the
  // server's order could swap between visits (#1005).
  const tied = { expiryDate: '2027-01-31', batch: 'B1' };

  it('breaks an expiry-and-name tie by location code as people read it; an unlocated batch last', () => {
    expect(
      sorted([
        { ...tied, location: { code: 'S10' } },
        { ...tied, location: null },
        { ...tied, location: { code: 'S2' } },
      ]).map(b => b.location?.code ?? null)
    ).toEqual(['S2', 'S10', null]);
  });

  it('then by pack size, smallest first; a batch with none last', () => {
    const located = { ...tied, location: { code: 'S1' } };
    expect(
      sorted([
        { ...located, packSize: 100 },
        { ...located, packSize: null },
        { ...located, packSize: 10 },
      ]).map(b => b.packSize)
    ).toEqual([10, 100, null]);
  });

  it('last by a fixed id — the saved line id, or the stock line id for a batch not yet on the stocktake', () => {
    const blank = {
      expiryDate: null,
      batch: null,
      location: null,
      packSize: 1,
    };
    // A stock batch's draft id is regenerated on every load, so its
    // stockLineId is the one that holds; a saved line has only its own id.
    const rows: Batch[] = [
      { ...blank, id: 'draft-z', stockLineId: 'stock-a' },
      { ...blank, id: 'line-m' },
      { ...blank, id: 'draft-a', stockLineId: 'stock-z' },
    ];
    const ids = (input: Batch[]) =>
      sorted(input).map(b => b.stockLineId ?? b.id);
    expect(ids(rows)).toEqual(['line-m', 'stock-a', 'stock-z']);
    // The same rows handed over in any other order land the same way.
    expect(ids([...rows].reverse())).toEqual(['line-m', 'stock-a', 'stock-z']);
  });
});
