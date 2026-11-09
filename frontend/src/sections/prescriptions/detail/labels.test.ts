import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadDateFnsLocale, localisedDate } from '../../../intl/formatDateTime';
import { setLocale } from '../../../intl/intl';
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
      // Never a label (OMS-REG-DIS-03.25/.55).
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

  it("dates the label in the app's format, not the runtime's locale", () => {
    // An en-US runtime (e.g. the desktop app on a Windows machine with a US
    // display language) — the side panel still shows 20/07/2026, so the
    // label must too (internal #1838). The day is 19 or 20 depending on the
    // test machine's time zone; either way, day first.
    const runtimeLocale = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('7/20/2026');
    try {
      const labels = buildLabels(prescription, 'Central Store');
      expect(labels[0].details).toContain(
        localisedDate(prescription.createdDatetime)
      );
      expect(labels[0].details).toMatch(/ - (19|20)\/07\/2026 - /);
    } finally {
      runtimeLocale.mockRestore();
    }
  });

  describe('in a language with its own digits', () => {
    afterEach(() => setLocale('en'));

    // The server blanks non-ASCII digits when it writes the ZPL, so an Arabic
    // label printed "Central Store -   /  /     " with no quantity.
    it('prints the date and quantity in Latin digits', async () => {
      await loadDateFnsLocale('ar');
      setLocale('ar');
      const [label] = buildLabels(prescription, 'Central Store');
      expect(label.itemDetails).toBe('21 tablet Aspirin');
      expect(label.details).toMatch(/ - (19|20)\/07\/2026 - /);
      expect(label.details).not.toMatch(/[\u0660-\u0669\u06f0-\u06f9]/);
    });

    it("keeps the language's date order", async () => {
      await loadDateFnsLocale('ps');
      setLocale('ps');
      const [label] = buildLabels(prescription, 'Central Store');
      expect(label.details).toMatch(/ - 2026\/07\/(19|20) - /);
    });

    it('still marks a quantity the configured places rounded', () => {
      setLocale('ar');
      const third = {
        ...prescription,
        lines: {
          nodes: [{ ...prescription.lines.nodes[0], numberOfPacks: 1 / 300 }],
        },
      } as PrescriptionFieldsFragment;
      expect(buildLabels(third, 'Central Store')[0].itemDetails).toBe(
        '0.33* tablet Aspirin'
      );
    });
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
