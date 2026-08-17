import { hasPermission, type UserPermission } from '../../store/storeContext';

// The two inbound-shipment permission scopes (spec/inbound-shipments
// › contract → permissions). Every read's `type` argument is BOTH a node filter
// and the permission selector, and the two scopes are disjoint buckets split
// purely by whether a shipment carries a `purchaseOrderId`:
//   - INBOUND_SHIPMENT          — plain scope: manual + transfer
//                                 (purchaseOrderId IS NULL)
//   - INBOUND_SHIPMENT_EXTERNAL — external scope: PO-linked
//                                 (purchaseOrderId IS NOT NULL)
// ⚠️ "external" here means PO-LINKED, not "external supplier": a manual
// shipment against an external (non-store) supplier is in the PLAIN scope.
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

export const isExternalScope = (scope: InboundScope): boolean =>
  scope === 'INBOUND_SHIPMENT_EXTERNAL';

// ── The detail route's scope param ───────────────────────────────────────────
// A single detail read has to name the shipment's own scope, and the id alone
// can never reveal it: both buckets return `type: INBOUND_SHIPMENT`, and a
// wrong-scope read comes back as RecordNotFound — indistinguishable from a
// missing record (contract → how the scope selector gates each read). So the
// URL carries it: whatever surfaces a shipment knows its scope (a listing
// carries purchaseOrderId; a create knows which mutation it called), and it
// hands that to the detail through the route rather than the detail
// rediscovering it by trying each held scope in turn.
//
// Every link into the detail is built by `inboundShipmentHref`, so the param
// can't be left off, and the detail reads it back with `scopeFromParam` and
// passes it straight to `type` — one request, whichever scope.
const SCOPE_PARAM = 'type';

export const inboundShipmentHref = (
  storeId: string,
  invoiceId: string,
  scope: InboundScope
): string =>
  `/${storeId}/replenishment/inbound-shipment/${invoiceId}?${SCOPE_PARAM}=${scope}`;

// The scope from that param. Anything unrecognised — a hand-typed URL, or a
// bookmark predating the param — reads as the plain scope, so opening a
// PO-linked shipment that way reports the wire's RecordNotFound. That is the
// honest outcome for a link that doesn't say which scope it means; the app's
// own links always say.
export const scopeFromParam = (raw: string | undefined): InboundScope =>
  raw === 'INBOUND_SHIPMENT_EXTERNAL'
    ? 'INBOUND_SHIPMENT_EXTERNAL'
    : 'INBOUND_SHIPMENT';

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
