import { describe, expect, it } from 'vitest';
import { shipmentsToCsv } from './shipmentsToCsv';
import type { OutboundShipmentsResult } from './outboundShipments.generated';

type ShipmentRow = OutboundShipmentsResult['invoices']['nodes'][number];

// Anchors: spec/outbound-shipments/cases/OMS-REG-DIST-01.
//   .6 — Export downloads a CSV of the shipments matching the active filters,
//        using the currently displayed columns (so Created renders as the
//        list's date cell does, not as the wire's ISO timestamp)
// The download plumbing (blob / Excel conversion) is out of scope for a unit;
// here we pin the row → CSV projection. In node the catalog isn't loaded, so
// t() falls back to its keys — header assertions pin keys standing in for the
// translated labels; the data cells are exact.

const row = (over: Partial<ShipmentRow> = {}): ShipmentRow => ({
  id: 'inv-1',
  otherPartyName: 'Lodudu HP',
  status: 'NEW',
  invoiceNumber: 615,
  createdDatetime: '2026-07-28T02:14:15.191530+00:00',
  theirReference: 'ref-9',
  comment: 'urgent',
  colour: null,
  pricing: { totalAfterTax: 12.5 },
  customFields: null,
  ...over,
});

describe('OMS-REG-DIST-01.6 — outbound shipments list CSV export', () => {
  it('emits one header row plus one line per shipment, columns in list order', () => {
    const csv = shipmentsToCsv([row()]);
    const [header, ...lines] = csv.split('\r\n');
    expect(header.split(',')).toEqual([
      'label.name',
      'label.status',
      'label.number',
      'label.created',
      'label.reference',
      'label.comment',
      'label.total',
    ]);
    expect(lines).toHaveLength(1);
    const cells = lines[0]!.split(',');
    expect(cells[0]).toBe('Lodudu HP');
    expect(cells[1]).toBe('label.new');
    expect(cells[2]).toBe('615');
    expect(cells[4]).toBe('ref-9');
    expect(cells[5]).toBe('urgent');
    expect(cells[6]).toBe('12.5');
  });

  it('localises Created — never the raw ISO timestamp', () => {
    const created = shipmentsToCsv([row()]).split('\r\n')[1]!.split(',')[3];
    // The list's Created column is a date cell, so the export is date-only in
    // the active locale (en → dd/MM/yyyy).
    expect(created).toBe('28/07/2026');
    expect(created).not.toContain('T');
  });

  it('renders every listed shipment, preserving order', () => {
    const csv = shipmentsToCsv([
      row({ id: 'a', invoiceNumber: 1 }),
      row({ id: 'b', invoiceNumber: 2 }),
      row({ id: 'c', invoiceNumber: 3 }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(4); // header + 3
    expect(lines.slice(1).map(l => l.split(',')[2])).toEqual(['1', '2', '3']);
  });
});
