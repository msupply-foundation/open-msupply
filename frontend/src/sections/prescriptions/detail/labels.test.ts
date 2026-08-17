import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRINT_LABEL_PRESCRIPTION_URL } from '../../../config';
import { buildLabels, printLabels, type PrescriptionLabel } from './labels';
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
      // A carrier line — a prescribed quantity with nothing dispensed. Never a
      // label (AC-Q1/V1).
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

const label: PrescriptionLabel = {
  itemDetails: '21 tablet Aspirin',
  itemDirections: 'every FOUR to SIX hours',
  warning: '',
  patientDetails: 'Ann Smith - P0042',
  details: 'Central Store - 20/07/2026',
};

const respondWith = (response: Response) => {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildLabels (.47 — one label per dispensed item)', () => {
  it('merges an item across batches, summing units and keeping its directions', () => {
    const labels = buildLabels(prescription, 'Central Store');
    expect(labels).toHaveLength(1); // the carrier line contributes nothing
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

describe('printLabels (.64 — the endpoint’s answer always reaches the caller)', () => {
  it('POSTs the labels as JSON and reports success', async () => {
    const fetchMock = respondWith(new Response('Label printed'));

    expect(await printLabels([label])).toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(PRINT_LABEL_PRESCRIPTION_URL);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init.body))).toEqual([label]);
  });

  it("carries the server's plain-text body as the failure detail", async () => {
    respondWith(
      new Response(
        'Error getting printer settings: DBError { msg: "No label printer settings found" }',
        { status: 500, statusText: 'Internal Server Error' }
      )
    );

    expect(await printLabels([label])).toEqual({
      ok: false,
      detail:
        'Error getting printer settings: DBError { msg: "No label printer settings found" }',
    });
  });

  it('falls back to the status line when the body is empty', async () => {
    respondWith(
      new Response('', { status: 500, statusText: 'Internal Server Error' })
    );

    expect(await printLabels([label])).toEqual({
      ok: false,
      detail: '500 Internal Server Error',
    });
  });

  it('reports a transport failure rather than throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Failed to fetch'))
    );

    expect(await printLabels([label])).toEqual({
      ok: false,
      detail: 'Failed to fetch',
    });
  });

  it('still reports a detail when what was thrown is not an Error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('printer exploded'));

    expect(await printLabels([label])).toEqual({
      ok: false,
      detail: 'printer exploded',
    });
  });
});
