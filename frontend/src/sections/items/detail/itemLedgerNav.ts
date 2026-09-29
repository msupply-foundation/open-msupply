import type { ItemLedgerResult } from './itemLedger.generated';
import { inboundShipmentHref } from '@/sections/inbound-shipments/inboundShipmentScope';

type LedgerRow = ItemLedgerResult['itemLedger']['nodes'][number];

// A ledger row's source-document route, by invoice type (spec/items
// OMS-REG-CAT-04.23/.43, rules.md § the detail record). Pure so the mapping
// is unit-tested without a router.
//
// isExternal (purchase-order-born inbound shipment) does not change the route
// itself — this rewrite renders both kinds on the one inbound-shipment detail
// route, unlike the schema doc-comment's "separate routes" (that describes the
// reference app). It does pick the route's scope param: the detail's single
// read has to name the shipment's permission scope, and isExternal is exactly
// what the schema exposes it for (see inboundShipmentHref).
//
// Inventory-adjustment rows (INVENTORY_ADDITION/INVENTORY_REDUCTION) never
// navigate (spec). SUPPLIER_RETURN and REPACK also don't navigate — neither
// has a built route in this app yet (a real gap, not a spec exclusion; see
// BUILD_REPORT.md).
export const ledgerRowHref = (
  storeId: string,
  row: Pick<LedgerRow, 'invoiceType' | 'invoiceId' | 'isExternal'>
): string | undefined => {
  switch (row.invoiceType) {
    case 'OUTBOUND_SHIPMENT':
      return `/${storeId}/distribution/outbound-shipment/${row.invoiceId}`;
    case 'INBOUND_SHIPMENT':
      return inboundShipmentHref(
        storeId,
        row.invoiceId,
        row.isExternal ? 'INBOUND_SHIPMENT_EXTERNAL' : 'INBOUND_SHIPMENT'
      );
    case 'CUSTOMER_RETURN':
      return `/${storeId}/distribution/customer-return/${row.invoiceId}`;
    case 'PRESCRIPTION':
      return `/${storeId}/dispensary/dispensing/${row.invoiceId}`;
    case 'INVENTORY_ADDITION':
    case 'INVENTORY_REDUCTION':
    case 'SUPPLIER_RETURN':
    case 'REPACK':
      return undefined;
  }
};
