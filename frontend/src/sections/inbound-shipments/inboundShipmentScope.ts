import { hasPermission, type UserPermission } from '../../store/storeContext';

// The two inbound-shipment permission scopes (spec/inbound-shipments
// › contract → permissions). Every read's `type` argument is BOTH a node filter
// and the permission selector, and the two scopes are disjoint buckets split
// purely by whether a shipment carries a `purchaseOrderId`:
//   - INBOUND_SHIPMENT          — plain scope: manual + transfer (purchaseOrderId IS NULL)
//   - INBOUND_SHIPMENT_EXTERNAL — external scope: PO-linked (purchaseOrderId IS NOT NULL)
// ⚠️ "external" here means PO-LINKED, not "external supplier": a manual shipment
// against an external (non-store) supplier is in the PLAIN scope.
export type InboundScope = 'INBOUND_SHIPMENT' | 'INBOUND_SHIPMENT_EXTERNAL';

// The query scopes the current user actually holds. The list requests exactly
// these — requesting a scope the user lacks refuses the WHOLE list (no partial
// result), and the detail fetch probes these — so a user sees precisely the
// shipments their scopes cover (contract → how the scope selector gates each
// read). Reactive: reads hasPermission (scoped to the entered store).
export const heldInboundQueryScopes = (): InboundScope[] => {
  const scopes: InboundScope[] = [];
  if (hasPermission('INBOUND_SHIPMENT_QUERY')) scopes.push('INBOUND_SHIPMENT');
  if (hasPermission('INBOUND_SHIPMENT_EXTERNAL_QUERY'))
    scopes.push('INBOUND_SHIPMENT_EXTERNAL');
  return scopes;
};

// The scope a shipment belongs to, from its own purchaseOrderId — the value the
// listing carries so a detail fetch can pick the right `type` without a probe.
export const scopeOf = (
  purchaseOrderId: string | null | undefined
): InboundScope =>
  purchaseOrderId != null ? 'INBOUND_SHIPMENT_EXTERNAL' : 'INBOUND_SHIPMENT';

// Whether the user may write to a shipment in this scope. The mutate
// permissions split the same two disjoint buckets as the query scopes, so the
// shipment's own scope selects which one applies — holding the plain scope's
// mutate grants nothing over a PO-linked shipment, and vice versa. Every edit
// surface is gated on this (rules → editability): without it the server refuses
// the write, and an enabled control would discard the user's input in silence.
export const mutatePermissionFor = (scope: InboundScope): UserPermission =>
  scope === 'INBOUND_SHIPMENT_EXTERNAL'
    ? 'INBOUND_SHIPMENT_EXTERNAL_MUTATE'
    : 'INBOUND_SHIPMENT_MUTATE';

export const canMutateInboundScope = (scope: InboundScope): boolean =>
  hasPermission(mutatePermissionFor(scope));
