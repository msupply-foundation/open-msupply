import { describe, expect, it } from 'vitest';
import {
  CustomerReturnDetail,
  CustomerReturnForCopy,
} from './customerReturnDetail.generated';

// Wire-contract pins for the detail screen's single-return reads
// (OMS-REG-DIST-07.14). The server's `invoice(storeId, id)` filters on id +
// store ONLY unless the `type` argument is named — without it an outbound
// shipment's id resolved to that shipment and the view rendered it as a
// customer return (issue #1044). The pin is a literal in the document, not a
// variable, so a regression can only come from editing the .graphql — which
// this catches.
const pinsCustomerReturn = (query: string) =>
  /invoice\([^)]*\btype:\s*CUSTOMER_RETURN\b[^)]*\)/.test(query);

describe('customer return detail reads pin type: CUSTOMER_RETURN', () => {
  it('the header read', () => {
    expect(pinsCustomerReturn(CustomerReturnDetail.query)).toBe(true);
  });

  it('the copy-to-clipboard read', () => {
    expect(pinsCustomerReturn(CustomerReturnForCopy.query)).toBe(true);
  });
});
