import { describe, expect, it } from 'vitest';
import {
  allocateUnits,
  buildSaveInput,
  canSave,
  draftAvailableUnits,
  seedDraftLines,
  type DraftLine,
} from './lineEditLogic';

const line = (over: Partial<DraftLine> & { id: string }): DraftLine => ({
  stockLineId: `stock-${over.id}`,
  numberOfPacks: 0,
  packSize: 1,
  batch: null,
  expiryDate: null,
  sellPricePerPack: 0,
  inStorePacks: 100,
  availablePacks: 100,
  stockLineOnHold: false,
  dosesPerUnit: 1,
  location: null,
  vvmStatus: null,
  barred: [],
  autoBarred: [],
  ...over,
});

const OPEN_PREFS = {
  expiredStockPreventIssue: false,
  expiredStockIssueThreshold: 0,
  manageVvmStatusForStock: false,
};

// Every seeding below passes this as `today`. `seedDraftLines` falls back to the
// real clock, and the expiry verdicts (barred / autoBarred) are computed against
// it — so a fixture dated "next month" silently becomes an EXPIRED batch once the
// wall clock passes it, and the allocation cases start reporting 0 packs. Dates
// are fixtures, not facts about now: pin the clock (as
// domain/allocation/policy.test.ts does) so these read the same in any year.
const TODAY = new Date('2026-01-01');

describe('seedDraftLines (stock-allocation AC-AL1/AL2 client face — FEFO order, barred verdicts)', () => {
  it('orders earliest expiry first with no-expiry last', () => {
    const seeded = seedDraftLines(
      [
        line({ id: 'none', expiryDate: null }),
        line({ id: 'late', expiryDate: '2027-01-01' }),
        line({ id: 'early', expiryDate: '2026-08-01' }),
      ],
      OPEN_PREFS,
      TODAY
    );
    expect(seeded.map(l => l.id)).toEqual(['early', 'late', 'none']);
  });

  it('hides on-hold rows outright — batch or location (.60, the prescriptions delta)', () => {
    const seeded = seedDraftLines(
      [
        line({ id: 'held', stockLineOnHold: true }),
        line({ id: 'held-location', location: { code: 'HL', onHold: true } }),
        line({ id: 'open' }),
      ],
      OPEN_PREFS,
      TODAY
    );
    expect(seeded.map(l => l.id)).toEqual(['open']);
  });

  it('keeps a held row already carrying an allocation, manually editable (AC-AL14)', () => {
    const seeded = seedDraftLines(
      [line({ id: 'held', stockLineOnHold: true, numberOfPacks: 2 })],
      OPEN_PREFS,
      TODAY
    );
    expect(seeded.map(l => l.id)).toEqual(['held']);
    expect(seeded[0].barred).toEqual([]); // row stays enabled
    expect(seeded[0].autoBarred).toContain('on-hold'); // never auto-filled
  });

  const vvm = (priority: number) => ({
    id: `vvm-${priority}`,
    description: `Stage ${priority}`,
    unusable: false,
    priority,
  });

  it('orders VVM priority before expiry under the preference — no-status last, expiry breaking ties (rules § ordering)', () => {
    const seeded = seedDraftLines(
      [
        line({ id: 'no-status', expiryDate: '2026-08-01' }),
        line({ id: 'p2', expiryDate: '2026-08-01', vvmStatus: vvm(2) }),
        line({ id: 'p1-late', expiryDate: '2027-01-01', vvmStatus: vvm(1) }),
        line({ id: 'p1-early', expiryDate: '2026-09-01', vvmStatus: vvm(1) }),
      ],
      { ...OPEN_PREFS, sortByVvmStatusThenExpiry: true },
      TODAY
    );
    expect(seeded.map(l => l.id)).toEqual([
      'p1-early',
      'p1-late',
      'p2',
      'no-status',
    ]);
  });

  it('ignores VVM priority with the preference off — plain FEFO', () => {
    const seeded = seedDraftLines(
      [
        line({ id: 'p1-late', expiryDate: '2027-01-01', vvmStatus: vvm(1) }),
        line({ id: 'p2-early', expiryDate: '2026-08-01', vvmStatus: vvm(2) }),
      ],
      { ...OPEN_PREFS, sortByVvmStatusThenExpiry: false },
      TODAY
    );
    expect(seeded.map(l => l.id)).toEqual(['p2-early', 'p1-late']);
  });
});

describe('draftAvailableUnits (AC-AL16 — the available figure, .71)', () => {
  it('counts only rows auto-distribution can draw from — an item with only expired stock reads 0 (issue #945)', () => {
    const seeded = seedDraftLines(
      [
        line({
          id: 'expired',
          expiryDate: '2025-12-01',
          packSize: 100,
          availablePacks: 24,
        }),
        line({
          id: 'usable',
          expiryDate: '2026-06-01',
          packSize: 10,
          availablePacks: 2,
        }),
      ],
      OPEN_PREFS,
      TODAY
    );
    expect(draftAvailableUnits(seeded)).toBe(20);
    expect(draftAvailableUnits(seeded.filter(l => l.id === 'expired'))).toBe(0);
  });

  it('excludes the held-with-allocation exception row — editable (AC-AL14), but no headroom for distribution', () => {
    const seeded = seedDraftLines(
      [
        line({
          id: 'held',
          stockLineOnHold: true,
          numberOfPacks: 2,
          availablePacks: 5,
          packSize: 10,
        }),
      ],
      OPEN_PREFS,
      TODAY
    );
    expect(seeded).toHaveLength(1);
    expect(draftAvailableUnits(seeded)).toBe(0);
  });
});

describe('allocateUnits (AC-A1 — partial packs: exact units, no over-allocation)', () => {
  it('splits a pack to fill the exact requested units', () => {
    // One batch of pack size 100 (the probed dispensing shape: 1 unit from a
    // 100-tab pack persists as 0.01 packs).
    const lines = seedDraftLines(
      [line({ id: 'a', packSize: 100, availablePacks: 100 })],
      OPEN_PREFS,
      TODAY
    );
    const { packsById, shortfallUnits } = allocateUnits(lines, 1);
    expect(packsById.get('a')).toBeCloseTo(0.01, 10);
    expect(shortfallUnits).toBe(0);
  });

  it('fills FEFO across batches and reports the shortfall (no placeholder)', () => {
    const lines = seedDraftLines(
      [
        line({ id: 'early', expiryDate: '2026-08-01', availablePacks: 2 }),
        line({ id: 'late', expiryDate: '2027-01-01', availablePacks: 3 }),
      ],
      OPEN_PREFS,
      TODAY
    );
    const { packsById, shortfallUnits } = allocateUnits(lines, 10);
    expect(packsById.get('early')).toBe(2);
    expect(packsById.get('late')).toBe(3);
    expect(shortfallUnits).toBe(5);
  });

  it('never allocates from an auto-barred batch (expired — prefs off, AC-AL10)', () => {
    const lines = seedDraftLines(
      [line({ id: 'expired', expiryDate: '2020-01-01', availablePacks: 50 })],
      OPEN_PREFS,
      TODAY
    );
    const { packsById, shortfallUnits } = allocateUnits(lines, 5);
    expect(packsById.get('expired')).toBe(0);
    expect(shortfallUnits).toBe(5);
  });

  it('reports a split pack with the nearest whole-pack quantity above (AC-AL12 — .58)', () => {
    const lines = seedDraftLines(
      [line({ id: 'a', packSize: 10, availablePacks: 10 })],
      OPEN_PREFS,
      TODAY
    );
    const { warnings } = allocateUnits(lines, 25); // 2.5 packs
    expect(warnings).toContainEqual({
      kind: 'partial-packs',
      nearestAboveUnits: 30,
    });
  });

  it('raises no split-pack warning when the allocation lands on whole packs', () => {
    const lines = seedDraftLines(
      [line({ id: 'a', packSize: 10, availablePacks: 10 })],
      OPEN_PREFS,
      TODAY
    );
    const { warnings } = allocateUnits(lines, 20);
    expect(warnings).toEqual([]);
  });

  it('reports barred stock passed over, without re-reporting the shortfall (AC-AL2 — .59)', () => {
    const lines = seedDraftLines(
      [
        line({ id: 'expired', expiryDate: '2020-01-01', availablePacks: 50 }),
        line({ id: 'open', availablePacks: 2 }),
      ],
      OPEN_PREFS,
      TODAY
    );
    const { warnings, shortfallUnits } = allocateUnits(lines, 5);
    expect(shortfallUnits).toBe(3);
    expect(warnings).toEqual([
      { kind: 'skipped-barred', reasons: ['expired'] },
    ]);
  });

  it('never reports an on-hold pass-over — held stock is hidden (.60), and the AC-AL14 exception row skips silently', () => {
    const lines = seedDraftLines(
      [
        // The exception row: held, carrying an allocation, stock remaining —
        // in the grid but never auto-filled and never reported.
        line({
          id: 'held',
          stockLineOnHold: true,
          numberOfPacks: 1,
          availablePacks: 50,
        }),
        line({ id: 'open', availablePacks: 2 }),
      ],
      OPEN_PREFS,
      TODAY
    );
    const { warnings, shortfallUnits, packsById } = allocateUnits(lines, 5);
    expect(packsById.get('held')).toBe(0);
    expect(shortfallUnits).toBe(3);
    expect(warnings).toEqual([]);
  });
});

describe('buildSaveInput (AC-I7 — the item set-save)', () => {
  const lines = [
    line({ id: 'keep', numberOfPacks: 1.5 }),
    line({ id: 'zeroed', numberOfPacks: 0 }),
  ];

  it('sends EVERY row — zeroed rows are how the server deletes lines', () => {
    const input = buildSaveInput('inv', 'item', lines, undefined, '');
    expect(input.lines).toHaveLength(2);
    expect(input.lines[1]).toEqual({
      id: 'zeroed',
      stockLineId: 'stock-zeroed',
      numberOfPacks: 0,
    });
  });

  it('carries the prescribed quantity only when entered (>0 — not clearable on the wire)', () => {
    expect(
      buildSaveInput('inv', 'item', lines, 25, '').prescribedQuantity
    ).toBe(25);
    expect(buildSaveInput('inv', 'item', lines, 0, '')).not.toHaveProperty(
      'prescribedQuantity'
    );
    expect(
      buildSaveInput('inv', 'item', lines, undefined, '')
    ).not.toHaveProperty('prescribedQuantity');
  });

  it('carries the trimmed directions note only when present (AC-R1 — written to every line server-side)', () => {
    expect(
      buildSaveInput('inv', 'item', lines, undefined, '  take with water ').note
    ).toBe('take with water');
    expect(
      buildSaveInput('inv', 'item', lines, undefined, '  ')
    ).not.toHaveProperty('note');
  });
});

describe('canSave (ui-surface S4 — OK needs an item, a change, and a non-zero outcome)', () => {
  it('disables until an item is chosen and a change is made', () => {
    expect(
      canSave({
        itemChosen: false,
        dirty: true,
        allocatedUnits: 5,
        prescribedQuantity: undefined,
      })
    ).toBe(false);
    expect(
      canSave({
        itemChosen: true,
        dirty: false,
        allocatedUnits: 5,
        prescribedQuantity: undefined,
      })
    ).toBe(false);
  });

  it('needs allocated units OR a prescribed quantity (AC-Q1 — demand without stock still saves)', () => {
    expect(
      canSave({
        itemChosen: true,
        dirty: true,
        allocatedUnits: 0,
        prescribedQuantity: undefined,
      })
    ).toBe(false);
    expect(
      canSave({
        itemChosen: true,
        dirty: true,
        allocatedUnits: 0,
        prescribedQuantity: 25,
      })
    ).toBe(true);
    expect(
      canSave({
        itemChosen: true,
        dirty: true,
        allocatedUnits: 3,
        prescribedQuantity: undefined,
      })
    ).toBe(true);
  });
});
