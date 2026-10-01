import { describe, expect, it } from 'vitest';
import {
  SupplierReturnDetail,
  SupplierReturnForCopy,
} from './supplierReturnDetail.generated';

// Wire-contract pins for the detail screen's single-return reads (ui-surface
// S3 § tabs; OMS-REG-REPL-06.43). The server's `invoice(storeId, id)` filters
// on id + store ONLY unless the `type` argument is named — without it an
// inbound shipment's id resolved to that shipment and the view rendered it as a
// supplier return, lifecycle and Add item included (issue #1044; confirmed
// live: untyped → InvoiceNode/INBOUND_SHIPMENT, typed → NodeError/
// RecordNotFound). The pin is a literal in the document, not a variable, so a
// regression can only come from editing the .graphql — which this catches.
const pinsSupplierReturn = (query: string) =>
  /invoice\(\s*storeId:\s*\$storeId,\s*id:\s*\$id,\s*type:\s*SUPPLIER_RETURN\s*\)/.test(
    query
  );

describe('supplier return detail reads pin type: SUPPLIER_RETURN', () => {
  it('the header read', () => {
    expect(pinsSupplierReturn(SupplierReturnDetail.query)).toBe(true);
  });

  it('the copy-to-clipboard read', () => {
    expect(pinsSupplierReturn(SupplierReturnForCopy.query)).toBe(true);
  });
});
