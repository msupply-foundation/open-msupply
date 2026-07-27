import { describe, expect, it } from 'vitest';
import { ledgerRowHref } from './itemLedgerNav';

const row = (invoiceType: string) => ({
  invoiceType: invoiceType as never,
  invoiceId: 'inv-1',
});

// OMS-REG-CAT-04.23/.43 — a ledger row navigates to its source document's own
// screen by type; inventory-adjustment rows (and the two types with no built
// route yet) don't navigate.
describe('ledgerRowHref (CAT-04.23/.43)', () => {
  it('routes an outbound shipment', () => {
    expect(ledgerRowHref('store-1', row('OUTBOUND_SHIPMENT'))).toBe(
      '/store-1/distribution/outbound-shipment/inv-1'
    );
  });

  it('routes an inbound shipment — the same route regardless of isExternal', () => {
    expect(ledgerRowHref('store-1', row('INBOUND_SHIPMENT'))).toBe(
      '/store-1/replenishment/inbound-shipment/inv-1'
    );
  });

  it('routes a customer return', () => {
    expect(ledgerRowHref('store-1', row('CUSTOMER_RETURN'))).toBe(
      '/store-1/distribution/customer-return/inv-1'
    );
  });

  it('routes a prescription', () => {
    expect(ledgerRowHref('store-1', row('PRESCRIPTION'))).toBe(
      '/store-1/dispensary/prescription/inv-1'
    );
  });

  it('does not navigate for inventory-adjustment rows', () => {
    expect(ledgerRowHref('store-1', row('INVENTORY_ADDITION'))).toBeUndefined();
    expect(
      ledgerRowHref('store-1', row('INVENTORY_REDUCTION'))
    ).toBeUndefined();
  });

  it('does not navigate for types with no built route yet', () => {
    expect(ledgerRowHref('store-1', row('SUPPLIER_RETURN'))).toBeUndefined();
    expect(ledgerRowHref('store-1', row('REPACK'))).toBeUndefined();
  });
});
