import { describe, expect, it } from 'vitest';
import { outstandingLinesToCsv } from './outstandingLinesToCsv';
import type { OutstandingLineRowFragment } from './outstandingLines.generated';

// Anchors: spec/purchase-orders/cases/
//   OMS-FUN-PO-14.11 — the list can be exported as it stands, carrying every
//                      field the list reports for a line
//   OMS-FUN-PO-14.2  — and the eleven fields it reports, in column order
// The download plumbing (blob / Excel conversion) belongs to the shared
// ListExportAction; here we pin the row → CSV projection. In node the catalog
// isn't loaded, so t() falls back to its keys — header assertions pin those
// keys standing in for the translated labels; the data cells are exact.

const row = (
  over: Partial<OutstandingLineRowFragment> = {}
): OutstandingLineRowFragment => ({
  id: 'pol-1',
  purchaseOrder: {
    id: 'po-1',
    number: 17,
    reference: 'REF-17',
    confirmedDatetime: '2026-09-02T10:30:00.000Z',
    user: { username: 'ahmadi' },
    supplier: { code: 'ACM', name: 'Acme Medical' },
  },
  item: { name: 'Amoxicillin 250mg' },
  expectedDeliveryDate: '2026-10-15',
  adjustedNumberOfUnits: 120,
  receivedNumberOfUnits: 45,
  outstandingNumberOfUnits: 75,
  ...over,
});

describe('OMS-FUN-PO-14.11 — outstanding-lines CSV export', () => {
  it('emits one header row plus one line per row, columns in list order', () => {
    const csv = outstandingLinesToCsv([row()]);
    const [header, ...lines] = csv.split('\r\n');
    expect(header.split(',')).toEqual([
      'label.purchase-order-number',
      'label.purchase-order-reference',
      'label.created-by',
      'label.supplier-code',
      'label.supplier-name',
      'label.item-name',
      'label.purchase-order-confirmed',
      'label.expected-delivery-date',
      'label.adjusted-units-expected',
      'label.total-received',
      'label.outstanding-units',
    ]);
    expect(lines).toHaveLength(1);
  });

  it('projects each line onto its eleven cells', () => {
    const [, line] = outstandingLinesToCsv([row()]).split('\r\n');
    expect(line.split(',')).toEqual([
      '17',
      'REF-17',
      'ahmadi',
      'ACM',
      'Acme Medical',
      'Amoxicillin 250mg',
      '02/09/2026',
      '15/10/2026',
      '120',
      '45',
      // The server's own figure, carried as reported — not re-derived from the
      // two cells before it (OMS-FUN-PO-14.13).
      '75',
    ]);
  });

  it('leaves an absent adjusted quantity, reference, date or party empty', () => {
    const [, line] = outstandingLinesToCsv([
      row({
        purchaseOrder: {
          id: 'po-2',
          number: 18,
          reference: null,
          confirmedDatetime: null,
          user: null,
          supplier: null,
        },
        expectedDeliveryDate: null,
        // No adjusted quantity: the expected figure is then the line's
        // requested quantity, which is not a column — so the cell is blank,
        // never 0 (ui-standards § absent values).
        adjustedNumberOfUnits: null,
        receivedNumberOfUnits: 0,
        outstandingNumberOfUnits: 12,
      }),
    ]).split('\r\n');
    expect(line.split(',')).toEqual([
      '18',
      '',
      '',
      '',
      '',
      'Amoxicillin 250mg',
      '',
      '',
      '',
      '0',
      '12',
    ]);
  });

  it('emits a header-only file for an empty list', () => {
    expect(outstandingLinesToCsv([]).split('\r\n')).toHaveLength(1);
  });
});
