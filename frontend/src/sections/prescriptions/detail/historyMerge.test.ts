import { describe, expect, it } from 'vitest';
import { historyRows } from './historyMerge';

const invoice = {
  id: 'inv-1',
  pickedDatetime: '2026-07-20T03:00:00Z',
  createdDatetime: '2026-07-20T02:00:00Z',
  clinician: { firstName: 'Steve', lastName: 'Franco' },
  lines: {
    nodes: [
      {
        itemId: 'aspirin',
        itemName: 'Aspirin',
        packSize: 100,
        numberOfPacks: 0.01,
        note: 'every FOUR to SIX hours',
      },
      {
        itemId: 'aspirin',
        itemName: 'Aspirin',
        packSize: 10,
        numberOfPacks: 2,
        note: null,
      },
      {
        itemId: 'dpt',
        itemName: 'DPT Vaccine',
        packSize: 1,
        numberOfPacks: 1,
        note: null,
      },
    ],
  },
};

describe('historyRows (AC-H1 — one row per item, lines merged)', () => {
  it('merges an item across batches, summing units and keeping the first note', () => {
    const rows = historyRows([invoice]);
    expect(rows).toHaveLength(2);
    const aspirin = rows.find(row => row.itemName === 'Aspirin');
    expect(aspirin?.units).toBeCloseTo(21, 10); // 0.01×100 + 2×10
    expect(aspirin?.directions).toBe('every FOUR to SIX hours');
  });

  it('carries the dispense date (picked over created) and the prescriber', () => {
    const rows = historyRows([invoice]);
    expect(rows[0].date).toBe('2026-07-20T03:00:00Z');
    expect(rows[0].prescriber).toBe('Franco, Steve');
  });

  it('falls back to the created time and an empty prescriber', () => {
    const rows = historyRows([
      { ...invoice, pickedDatetime: null, clinician: null },
    ]);
    expect(rows[0].date).toBe('2026-07-20T02:00:00Z');
    expect(rows[0].prescriber).toBe('');
  });
});
