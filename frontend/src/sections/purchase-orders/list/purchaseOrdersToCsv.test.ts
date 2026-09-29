import { describe, expect, it } from 'vitest';
import { purchaseOrdersToCsv } from './purchaseOrdersToCsv';
import type { PurchaseOrderRowFragment } from './purchaseOrders.generated';

// Anchors: spec/purchase-orders/cases/
//   OMS-FUN-PO-10.2  — the export carries every field the list reports, in the
//                      order the list shows them
//   OMS-FUN-PO-15.14 — and names them: supplier, number, the four dates, the
//                      state, target months, total cost, currency, line count,
//                      comment
// The download plumbing (blob / Excel conversion) belongs to the shared
// ListExportAction; here we pin the row → CSV projection. In node the catalog
// isn't loaded, so t() falls back to its keys — header assertions pin those
// keys standing in for the translated labels; the data cells are exact.

const row = (
  over: Partial<PurchaseOrderRowFragment> = {}
): PurchaseOrderRowFragment => ({
  id: 'po-1',
  number: 17,
  supplier: { id: 'sup-1', name: 'Acme Medical' },
  createdDatetime: '2026-09-01T09:00:00.000Z',
  confirmedDatetime: '2026-09-02T10:30:00.000Z',
  sentDatetime: '2026-09-03T11:00:00.000Z',
  requestedDeliveryDate: '2026-10-15',
  status: 'SENT',
  targetMonths: 3,
  orderTotalAfterDiscount: 1234.5,
  currency: { code: 'NZD' },
  lines: { totalCount: 2 },
  comment: 'urgent, split delivery',
  ...over,
});

describe('OMS-FUN-PO-10.2 — purchase-orders list CSV export', () => {
  it('emits one header row plus one line per order, columns in list order', () => {
    const csv = purchaseOrdersToCsv([row()]);
    const [header, ...lines] = csv.split('\r\n');
    expect(header.split(',')).toEqual([
      'label.supplier',
      'label.number',
      'label.created',
      'label.confirmed',
      'label.sent',
      'label.requested-delivery-date',
      'label.status',
      'label.target-months',
      'label.total-cost',
      'label.currency',
      'label.lines',
      'label.comment',
    ]);
    expect(lines).toHaveLength(1);
  });

  it('projects each order onto its twelve cells', () => {
    const [, line] = purchaseOrdersToCsv([row()]).split('\r\n');
    // A comma in the comment is quoted by toCsv, so the row is compared whole
    // rather than split on commas.
    expect(line).toBe(
      [
        'Acme Medical',
        '17',
        '01/09/2026',
        '02/09/2026',
        '03/09/2026',
        '15/10/2026',
        // The stored name is "SENT"; the export carries the label, like every
        // other surface (ui-surface § status labels).
        'label.sent',
        '3',
        '1234.5',
        'NZD',
        '2',
        '"urgent, split delivery"',
      ].join(',')
    );
  });

  it('leaves an unset date, supplier, currency, target months or comment empty', () => {
    const [, line] = purchaseOrdersToCsv([
      row({
        supplier: null,
        confirmedDatetime: null,
        sentDatetime: null,
        requestedDeliveryDate: null,
        status: 'NEW',
        targetMonths: null,
        currency: null,
        comment: null,
      }),
    ]).split('\r\n');
    expect(line.split(',')).toEqual([
      '',
      '17',
      '01/09/2026',
      '',
      '',
      '',
      'label.new',
      '',
      '1234.5',
      '',
      '2',
      '',
    ]);
  });

  it('emits a header-only file for an empty list', () => {
    expect(purchaseOrdersToCsv([]).split('\r\n')).toHaveLength(1);
  });
});

describe('an order with no lines has no total', () => {
  it('leaves the total-cost cell blank rather than exporting the fabricated 0', () => {
    const [, line] = purchaseOrdersToCsv([
      row({ orderTotalAfterDiscount: 0, lines: { totalCount: 0 } }),
    ]).split('\r\n');
    const cells = line.split(',');
    // Total cost is the ninth column (after target months, before currency).
    expect(cells[8]).toBe('');
    expect(cells[9]).toBe('NZD');
  });
});
