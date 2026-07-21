import { graphqlFetch } from '../../../api/graphql';
import {
  UpdateInboundShipment,
  UpdateInboundShipmentExternal,
  BatchInboundShipment,
  BatchInboundShipmentExternal,
  DeleteInboundShipment,
  DeleteInboundShipmentExternal,
  AddToInboundShipmentFromMasterList,
  type InboundInfoFragment,
  type UpdateInboundShipmentVariables,
  type BatchInboundShipmentVariables,
} from './inboundShipmentDetail.generated';

// Update/batch helpers for the inbound-shipment detail view. Every mutation is
// TWINNED (plain vs `...External`): the external variant is required whenever
// the shipment has a purchaseOrderId (contract → creation wire trap — the type
// check gates every twinned mutation on every call). `isExternal` is derived
// once from the shipment and threaded through, so the view never picks the
// wrong twin.

export const isExternalShipment = (info: {
  purchaseOrderId?: string | null;
}): boolean => info.purchaseOrderId != null;

// A header/status update. Returns a discriminated result so a caller can
// surface the server's verdict inline (spec S7 → action verdicts): buffered
// field saves ignore the 'error' case (the UI disables the field when not
// editable, so a rejection there is unexpected), while the status control and
// currency/charges panel show `message` in place.
export type InboundUpdateResult =
  | { kind: 'saved'; node: InboundInfoFragment }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const updateInboundShipment = async (
  storeId: string,
  isExternal: boolean,
  input: UpdateInboundShipmentVariables['input']
): Promise<InboundUpdateResult> => {
  // Branch (not a document union) so graphqlFetch infers each twin's types.
  const response = isExternal
    ? await graphqlFetch(UpdateInboundShipmentExternal, {
        storeId,
        input,
      }).then(r =>
        r.kind === 'success' ? r.data.updateInboundShipmentExternal : undefined
      )
    : await graphqlFetch(UpdateInboundShipment, { storeId, input }).then(r =>
        r.kind === 'success' ? r.data.updateInboundShipment : undefined
      );
  if (!response) return { kind: 'failed' };
  if (response.__typename === 'InvoiceNode')
    return { kind: 'saved', node: response };
  return { kind: 'error', message: response.error.description };
};

// Convenience for the buffered field/colour/hold saves: route the (unexpected)
// rejection path away and hand back the fresh node on success.
export const saveInboundShipmentFields = async (
  storeId: string,
  isExternal: boolean,
  input: UpdateInboundShipmentVariables['input']
): Promise<InboundInfoFragment | undefined> => {
  const result = await updateInboundShipment(storeId, isExternal, input);
  return result.kind === 'saved' ? result.node : undefined;
};

// A per-line error stamped from a failed batch (line id → server description).
export type InboundLineErrors = Map<string, string>;

export type BatchOutcome = {
  /** At least one operation committed (so the view refetches its page). */
  applied: boolean;
  /** Per-line failures, keyed by the line id the failure is about. */
  errors: InboundLineErrors;
};

// Run a line/service-line batch (insert/update/delete + insert-from-internal-
// order), picking the plain vs external twin. All-or-nothing by default
// (continueOnError omitted). Transport/NodeError → null (global modal already
// showed it). Otherwise returns which ops applied and any per-line errors.
export const runInboundBatch = async (
  storeId: string,
  isExternal: boolean,
  input: BatchInboundShipmentVariables['input']
): Promise<BatchOutcome | null> => {
  const batch = isExternal
    ? await graphqlFetch(BatchInboundShipmentExternal, { storeId, input }).then(
        r =>
          r.kind === 'success' ? r.data.batchInboundShipmentExternal : undefined
      )
    : await graphqlFetch(BatchInboundShipment, { storeId, input }).then(r =>
        r.kind === 'success' ? r.data.batchInboundShipment : undefined
      );
  if (!batch) return null;
  return summariseBatch(batch as BatchResponse);
};

// The shared shape of both batch twins' responses (each is one list of
// {id, response} per operation kind).
type WithId = {
  id: string;
  response:
    | { __typename: 'InvoiceNode' | 'DeleteResponse' }
    | { __typename: string; error: { description: string } };
};
type BatchResponse = {
  insertInboundShipmentLines?: WithId[] | null;
  updateInboundShipmentLines?: WithId[] | null;
  deleteInboundShipmentLines?: WithId[] | null;
  insertFromInternalOrderLines?: WithId[] | null;
  insertInboundShipmentServiceLines?: WithId[] | null;
  updateInboundShipmentServiceLines?: WithId[] | null;
  deleteInboundShipmentServiceLines?: WithId[] | null;
};

const OK_TYPENAMES = new Set(['InvoiceNode', 'DeleteResponse']);

const summariseBatch = (batch: BatchResponse): BatchOutcome => {
  const errors: InboundLineErrors = new Map();
  let applied = false;
  const scan = (items: WithId[] | null | undefined) => {
    for (const item of items ?? []) {
      if (OK_TYPENAMES.has(item.response.__typename)) {
        applied = true;
      } else if ('error' in item.response) {
        errors.set(item.id, item.response.error.description);
      }
    }
  };
  scan(batch.insertInboundShipmentLines);
  scan(batch.updateInboundShipmentLines);
  scan(batch.deleteInboundShipmentLines);
  scan(batch.insertFromInternalOrderLines);
  scan(batch.insertInboundShipmentServiceLines);
  scan(batch.updateInboundShipmentServiceLines);
  scan(batch.deleteInboundShipmentServiceLines);
  return { applied, errors };
};

// Delete a whole shipment (side panel). Picks the twin; returns the server's
// rejection message on a typed error, or undefined on success/transport-fail
// (the latter already surfaced globally).
export const deleteInboundShipment = async (
  storeId: string,
  isExternal: boolean,
  id: string
): Promise<{ ok: boolean; message?: string }> => {
  const response = isExternal
    ? await graphqlFetch(DeleteInboundShipmentExternal, {
        storeId,
        input: { id },
      }).then(r =>
        r.kind === 'success' ? r.data.deleteInboundShipmentExternal : undefined
      )
    : await graphqlFetch(DeleteInboundShipment, {
        storeId,
        input: { id },
      }).then(r =>
        r.kind === 'success' ? r.data.deleteInboundShipment : undefined
      );
  if (!response) return { ok: false };
  if (response.__typename === 'DeleteResponse') return { ok: true };
  return { ok: false, message: response.error.description };
};

// Bulk-add empty stock lines from a master list (spec AC-ML1). Returns the
// count added, or a rejection message.
export const addFromMasterList = async (
  storeId: string,
  shipmentId: string,
  masterListId: string
): Promise<{ ok: boolean; added?: number; message?: string }> => {
  const result = await graphqlFetch(AddToInboundShipmentFromMasterList, {
    storeId,
    input: { shipmentId, masterListId },
  });
  if (result.kind !== 'success') return { ok: false };
  const response = result.data.addToInboundShipmentFromMasterList;
  if (response.__typename === 'InvoiceLineConnector')
    return { ok: true, added: response.totalCount };
  if (response.__typename === 'AddToInboundShipmentFromMasterListError')
    return { ok: false, message: response.error.description };
  return { ok: false };
};
