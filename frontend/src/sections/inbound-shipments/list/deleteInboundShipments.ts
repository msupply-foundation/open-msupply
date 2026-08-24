import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
} from '@/api/graphql';
import { deleteRejection } from '@/domain/invoice';
import {
  DeleteInboundShipments,
  DeleteInboundShipmentsExternal,
  type BulkDeleteResultFragment,
} from './inboundShipments.generated';
import { isExternalScope, type InboundScope } from '../inboundShipmentScope';

// The list's bulk delete, run ONE BATCH PER SCOPE (issue #1213).
//
// Every inbound mutation is twinned (contract → creation wire trap), and the
// batch is no exception: the server matches each id against the twin it was
// sent to — `batchInboundShipment` takes only purchaseOrderId IS NULL,
// `batchInboundShipmentExternal` only PO-linked. A PO-linked id in the plain
// batch is not a per-id typed error but an UNTYPED top-level
// `WrongInboundShipmentType` that aborts the whole batch, so sending the lot to
// the plain twin made a PO-linked shipment undeletable from the list — and,
// before `returnGraphqlErrors`, took the global unexpected-error modal (whose
// "Try again" is a page reload) with it.
//
// So the selection is partitioned by the scope each row carries and submitted
// as one batch per scope. Each batch keeps its own all-or-nothing guarantee
// (AC-BA1); ACROSS the two, a refusal in the second leaves the first one's
// shipments deleted, which is why the outcome reports a count rather than a
// bare ok/failed — the caller reports the partial outcome and refetches.
export type BulkDeleteOutcome = {
  /** How many shipments the server actually removed. */
  deleted: number;
  /** The server's reason, when a batch was refused. */
  message?: string;
  /** Raw server text behind a disclosure, when the refusal arrived untyped. */
  detail?: string;
  /** A standing permission block — the global modal (D38) already shows it. */
  forbidden?: true;
  /** Transport/unexpected failure — graphqlFetch already surfaced it. */
  failed?: true;
};

// Plain before external. The order is fixed rather than selection-order so a
// mixed rejection is reproducible: whichever scope refuses stops the run, and
// only the batches before it committed.
const SCOPE_ORDER: InboundScope[] = [
  'INBOUND_SHIPMENT',
  'INBOUND_SHIPMENT_EXTERNAL',
];

export const deleteInboundShipments = async (
  storeId: string,
  selection: readonly { id: string; scope: InboundScope }[]
): Promise<BulkDeleteOutcome> => {
  let deleted = 0;
  for (const scope of SCOPE_ORDER) {
    const ids = selection
      .filter(s => s.scope === scope)
      .map(({ id }) => ({ id }));
    if (ids.length === 0) continue;
    const outcome = await runScopeBatch(storeId, scope, ids);
    deleted += outcome.deleted;
    // A refusal in one scope says nothing about the other, but the user asked
    // for one action: stop and report, rather than pressing on and stacking a
    // second rejection on the first.
    if (outcome.message || outcome.forbidden || outcome.failed)
      return { ...outcome, deleted };
  }
  return { deleted };
};

const runScopeBatch = async (
  storeId: string,
  scope: InboundScope,
  ids: { id: string }[]
): Promise<BulkDeleteOutcome> => {
  // Branch (not a document union) so graphqlFetch infers each twin's types.
  const result = isExternalScope(scope)
    ? await graphqlFetch(
        DeleteInboundShipmentsExternal,
        { storeId, ids },
        // A per-line delete lock (transferred / reserved / stocktake-referenced
        // — rules → deletion) and a wrong-scope id both come back as TOP-LEVEL
        // GraphQL errors rather than a typed DeleteInboundShipmentError. Take
        // those here so the refusal lands in the surface that fired the action
        // (D21) instead of tripping the global unexpected-error (reload) modal.
        { returnGraphqlErrors: true }
      )
    : await graphqlFetch(
        DeleteInboundShipments,
        { storeId, ids },
        { returnGraphqlErrors: true }
      );

  if (result.kind === 'graphqlError') {
    // Opting into graphql errors also intercepts Forbidden, which owes the user
    // the global permission-denied modal (D38) rather than an inline rejection.
    // Reachable per scope: the two mutate permissions are disjoint buckets, so
    // a user may hold the plain scope's and not the external one's.
    if (isForbidden(result.errors)) {
      reportPermissionDenied(missingPermissions(result.errors));
      return { deleted: 0, forbidden: true };
    }
    return { deleted: 0, ...deleteRejection(result.errors) };
  }
  if (result.kind !== 'success') return { deleted: 0, failed: true };

  const batch: BulkDeleteResultFragment =
    'batchInboundShipmentExternal' in result.data
      ? result.data.batchInboundShipmentExternal
      : result.data.batchInboundShipment;
  return summariseScopeBatch(batch);
};

// Fold one scope's batch response. The batch is all-or-nothing (AC-BA1), so a
// single typed refusal means NOTHING in it was removed — the count is zero
// however many siblings reported a DeleteResponse alongside it.
const summariseScopeBatch = (
  batch: BulkDeleteResultFragment
): BulkDeleteOutcome => {
  const items = batch.deleteInboundShipments ?? [];
  const refused = items.find(
    i => i.response.__typename === 'DeleteInboundShipmentError'
  );
  if (refused && refused.response.__typename === 'DeleteInboundShipmentError')
    return { deleted: 0, message: refused.response.error.description };
  return {
    deleted: items.filter(i => i.response.__typename === 'DeleteResponse')
      .length,
  };
};
