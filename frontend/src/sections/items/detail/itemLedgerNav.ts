import type { ItemLedgerResult } from './itemLedger.generated';

type LedgerRow = ItemLedgerResult['itemLedger']['nodes'][number];

// A ledger row's source-document route, by invoice type (spec/items
// OMS-REG-CAT-04.23/.43, rules.md § the detail record). Pure so the mapping
// is unit-tested without a router.
//
// isExternal (purchase-order-born inbound shipment) does NOT change the
// route: InboundShipmentDetailView already renders both regular and
// PO-born shipments on the same route, branching internally on
// isExternalShipment() — unlike the schema doc-comment's "separate routes"
// (that describes the reference app; this rewrite unified them).
//
// Inventory-adjustment rows (INVENTORY_ADDITION/INVENTORY_REDUCTION) never
// navigate (spec). SUPPLIER_RETURN and REPACK also don't navigate — neither
// has a built route in this app yet (a real gap, not a spec exclusion; see
// BUILD_REPORT.md).
export const ledgerRowHref = (
  storeId: string,
  row: Pick<LedgerRow, 'invoiceType' | 'invoiceId'>
): string | undefined => {
  switch (row.invoiceType) {
    case 'OUTBOUND_SHIPMENT':
      return `/${storeId}/distribution/outbound-shipment/${row.invoiceId}`;
    case 'INBOUND_SHIPMENT':
      return `/${storeId}/replenishment/inbound-shipment/${row.invoiceId}`;
    case 'CUSTOMER_RETURN':
      return `/${storeId}/distribution/customer-return/${row.invoiceId}`;
    case 'PRESCRIPTION':
      return `/${storeId}/dispensary/prescription/${row.invoiceId}`;
    case 'INVENTORY_ADDITION':
    case 'INVENTORY_REDUCTION':
    case 'SUPPLIER_RETURN':
    case 'REPACK':
      return undefined;
  }
};
