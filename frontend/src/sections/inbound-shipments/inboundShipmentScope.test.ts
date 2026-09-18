import { describe, expect, it } from 'vitest';
import {
  inboundShipmentHref,
  mutatePermissionFor,
  scopeFromParam,
  scopeOf,
} from './inboundShipmentScope';

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

// The detail route carries the scope, because a single read must name it and
// the id can't reveal it (contract § how the scope selector gates each read).
describe('the detail route scope param', () => {
  it('names the scope in every link into the detail', () => {
    expect(inboundShipmentHref('store-1', 'inv-1', 'INBOUND_SHIPMENT')).toBe(
      '/store-1/replenishment/inbound-shipment/inv-1?type=INBOUND_SHIPMENT'
    );
    expect(
      inboundShipmentHref('store-1', 'inv-1', 'INBOUND_SHIPMENT_EXTERNAL')
    ).toBe(
      '/store-1/replenishment/inbound-shipment/inv-1?type=INBOUND_SHIPMENT_EXTERNAL'
    );
  });

  it('round-trips the scope the link carried', () => {
    for (const scope of [
      'INBOUND_SHIPMENT',
      'INBOUND_SHIPMENT_EXTERNAL',
    ] as const) {
      const href = inboundShipmentHref('store-1', 'inv-1', scope);
      expect(
        scopeFromParam(
          new URL(href, 'http://x').searchParams.get('type') ?? undefined
        )
      ).toBe(scope);
    }
  });

  // A link that doesn't say which scope it means — hand-typed, or a bookmark
  // predating the param — reads as the plain scope. A PO-linked shipment opened
  // that way reports the wire's RecordNotFound rather than being probed for.
  it('reads an absent or unrecognised param as the plain scope', () => {
    expect(scopeFromParam(undefined)).toBe('INBOUND_SHIPMENT');
    expect(scopeFromParam('')).toBe('INBOUND_SHIPMENT');
    expect(scopeFromParam('OUTBOUND_SHIPMENT')).toBe('INBOUND_SHIPMENT');
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
