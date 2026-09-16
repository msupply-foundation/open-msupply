import { describe, expect, it } from 'vitest';
import { buildLabels } from './labels';
import type { PrescriptionFieldsFragment } from './prescriptionDetail.generated';

// Only the fields buildLabels reads — one cast at the fixture boundary, as
// stockToCsv.test.ts does, rather than transcribing the whole fragment.
const prescription = {
  createdDatetime: '2026-07-20T02:00:00Z',
  clinician: { firstName: 'Steve', lastName: 'Franco' },
  patient: { name: 'Ann Smith', code: 'P0042' },
  lines: {
    nodes: [
      {
        id: 'line-1',
        type: 'STOCK_OUT',
        itemId: 'aspirin',
        itemName: 'Aspirin',
        packSize: 100,
        numberOfPacks: 0.01,
        note: null,
        item: { unitName: 'tablet' },
      },
      {
        id: 'line-2',
        type: 'STOCK_OUT',
        itemId: 'aspirin',
        itemName: 'Aspirin',
        packSize: 10,
        numberOfPacks: 2,
        note: 'every FOUR to SIX hours',
        item: { unitName: 'tablet' },
      },
      // A placeholder line — a prescribed quantity with nothing dispensed.
      // Never a label (AC-Q1/V1).
      {
        id: 'line-3',
        type: 'UNALLOCATED_STOCK',
        itemId: 'dpt',
        itemName: 'DPT Vaccine',
        packSize: 0,
        numberOfPacks: 0,
        note: null,
        item: { unitName: 'dose' },
      },
    ],
  },
} as unknown as PrescriptionFieldsFragment;

describe('buildLabels (.47 — one label per dispensed item)', () => {
  it('merges an item across batches, summing units and keeping its directions', () => {
    const labels = buildLabels(prescription, 'Central Store');
    expect(labels).toHaveLength(1); // the placeholder line contributes nothing
    expect(labels[0].itemDetails).toBe('21 tablet Aspirin'); // 0.01×100 + 2×10
    expect(labels[0].itemDirections).toBe('every FOUR to SIX hours');
    expect(labels[0].patientDetails).toBe('Ann Smith - P0042');
    expect(labels[0].details).toContain('Central Store');
    expect(labels[0].details).toContain('Franco, Steve');
  });

  it('labels only the given lines when a selection is printed', () => {
    const selected = prescription.lines.nodes.filter(
      line => line.id === 'line-2'
    );
    const labels = buildLabels(prescription, 'Central Store', selected);
    expect(labels).toHaveLength(1);
    expect(labels[0].itemDetails).toBe('20 tablet Aspirin');
  });
});
