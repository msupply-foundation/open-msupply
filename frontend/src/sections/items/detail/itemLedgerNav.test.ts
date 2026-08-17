import { describe, expect, it } from 'vitest';
import { itemLedgerHref, ledgerRowHref } from './itemLedgerNav';

const row = (invoiceType: string, isExternal = false) => ({
  invoiceType: invoiceType as never,
  invoiceId: 'inv-1',
  isExternal,
});

// The Ledger tab's own deep link (?tab= — ui-surface S2); what a read-only
// prescription's row selection navigates to (OMS-REG-DIS-03.72).
describe('itemLedgerHref (DIS-03.72 consumer)', () => {
  it('targets the item catalogue detail on its Ledger tab', () => {
    expect(itemLedgerHref('store-a', 'item-1')).toBe(
      '/store-a/catalogue/items/item-1?tab=ledger'
    );
  });
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

  // One route for both inbound scopes; isExternal only selects the route's
  // scope param, which the detail's single read needs (it can't be recovered
  // from the id).
  it('routes an inbound shipment in the plain scope', () => {
    expect(ledgerRowHref('store-1', row('INBOUND_SHIPMENT'))).toBe(
      '/store-1/replenishment/inbound-shipment/inv-1?type=INBOUND_SHIPMENT'
    );
  });

  it('routes a PO-linked inbound shipment in the external scope', () => {
    expect(ledgerRowHref('store-1', row('INBOUND_SHIPMENT', true))).toBe(
      '/store-1/replenishment/inbound-shipment/inv-1?type=INBOUND_SHIPMENT_EXTERNAL'
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
