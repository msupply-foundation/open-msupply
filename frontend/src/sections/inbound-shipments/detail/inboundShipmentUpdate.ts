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
  type BatchResultFragment,
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
  return summariseBatch(batch);
};

// Fold one batch twin's response (the generated BatchResultFragment) into
// {applied, errors}. Each operation array is scanned against its OWN success
// typename — a line/service-line insert or update commits as InvoiceLineNode, a
// delete as DeleteResponse — so the else branch narrows to that operation's
// typed error variant and we read `error.description` directly. Reading the
// generated union per array (rather than a shared Set<string>) is what makes a
// wrong success typename a compile error: the earlier flat set checked for
// 'InvoiceNode' (the shipment-LEVEL twin), which never matched, so `applied`
// stayed false and a save never refetched the detail page.
const summariseBatch = (batch: BatchResultFragment): BatchOutcome => {
  const errors: InboundLineErrors = new Map();
  let applied = false;

  for (const { id, response } of batch.insertInboundShipmentLines ?? []) {
    if (response.__typename === 'InvoiceLineNode') applied = true;
    else errors.set(id, response.error.description);
  }
  for (const { id, response } of batch.updateInboundShipmentLines ?? []) {
    if (response.__typename === 'InvoiceLineNode') applied = true;
    else errors.set(id, response.error.description);
  }
  for (const { id, response } of batch.deleteInboundShipmentLines ?? []) {
    if (response.__typename === 'DeleteResponse') applied = true;
    else errors.set(id, response.error.description);
  }
  // insert-from-internal-order has no error arm in the batch result.
  for (const { response } of batch.insertFromInternalOrderLines ?? []) {
    if (response.__typename === 'InvoiceLineNode') applied = true;
  }
  for (const { id, response } of batch.insertInboundShipmentServiceLines ??
    []) {
    if (response.__typename === 'InvoiceLineNode') applied = true;
    else errors.set(id, response.error.description);
  }
  for (const { id, response } of batch.updateInboundShipmentServiceLines ??
    []) {
    if (response.__typename === 'InvoiceLineNode') applied = true;
    else errors.set(id, response.error.description);
  }
  for (const { id, response } of batch.deleteInboundShipmentServiceLines ??
    []) {
    if (response.__typename === 'DeleteResponse') applied = true;
    else errors.set(id, response.error.description);
  }
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
