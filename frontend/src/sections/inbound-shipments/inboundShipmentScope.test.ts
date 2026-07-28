import { describe, expect, it } from 'vitest';
import { mutatePermissionFor, scopeOf } from './inboundShipmentScope';

// The two inbound-shipment permission scopes and the edit permission each one
// demands (spec/inbound-shipments/rules.md § permissions, § editability).

describe('scopeOf', () => {
  // "External" means PO-LINKED, not "external supplier" — the naming trap the
  // contract calls out. A manual shipment against an external supplier is in
  // the plain scope; only a purchaseOrderId moves it to the external one.
  it('splits on the purchase-order link alone', () => {
    expect(scopeOf('po-1')).toBe('INBOUND_SHIPMENT_EXTERNAL');
    expect(scopeOf(null)).toBe('INBOUND_SHIPMENT');
    expect(scopeOf(undefined)).toBe('INBOUND_SHIPMENT');
  });
});

describe('mutatePermissionFor', () => {
  it('demands each scope its own edit permission', () => {
    expect(mutatePermissionFor('INBOUND_SHIPMENT')).toBe(
      'INBOUND_SHIPMENT_MUTATE'
    );
    expect(mutatePermissionFor('INBOUND_SHIPMENT_EXTERNAL')).toBe(
      'INBOUND_SHIPMENT_EXTERNAL_MUTATE'
    );
  });

  // The scopes are disjoint buckets, so the permission follows the shipment's
  // own scope: holding the plain scope's edit permission grants nothing over a
  // purchase-order-linked shipment.
  it('routes a PO-linked shipment to the external permission', () => {
    expect(mutatePermissionFor(scopeOf('po-1'))).toBe(
      'INBOUND_SHIPMENT_EXTERNAL_MUTATE'
    );
    expect(mutatePermissionFor(scopeOf(null))).toBe('INBOUND_SHIPMENT_MUTATE');
  });
});
