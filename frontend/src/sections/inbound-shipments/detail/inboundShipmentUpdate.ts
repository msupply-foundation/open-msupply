import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
  type GraphqlErrorItem,
} from '../../../api/graphql';
import { translateServerError } from '../../../intl/intlUtils';
import { deleteRejection } from '@/domain/invoice';
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
// check gates every twinned mutation on every call). `isExternal` comes from
// the route's scope param (inboundShipmentScope) and is threaded through every
// edit surface, so the twin is chosen once per screen and never re-derived.
//
// The server rejects an action two ways (contract → typed vs non-typed
// rejections): a TYPED member inside the response union (read
// `error.description`), or an UNTYPED top-level `Bad user input` whose Rust
// variant name is in `extensions.details`. Every runner opts into
// `returnGraphqlErrors` so the untyped kind comes back as a `graphqlError`
// result we translate and surface inline — WITHOUT it, an untyped rejection
// trips the global unexpected-error modal (a full-page crash), which is exactly
// the S7 "never a toast, surfaced inline" contract broken. Unauthenticated /
// unexpected / transport failures still route globally (graphqlFetch keeps
// those; only Forbidden shifts to the caller under returnGraphqlErrors — a
// mutation the user can't perform then reads as an inline rejection, acceptable
// for these edit surfaces).

// A placeholder line — a stock-in line with zero packs received and nothing
// reported shipped: a line added but not yet received. It carries no received
// quantity and is trimmed the first time the shipment advances out of New
// (rules → placeholder trimming), so the detail table de-emphasises it in the
// info tone (spec ui-surface → Line table, AC-V3). Mirrors the reference app's
// `isInboundPlaceholderRow`. Structural param — no fragment import needed.
export const isPlaceholderLine = (line: {
  type: string;
  numberOfPacks: number;
  shippedNumberOfPacks?: number | null;
}): boolean =>
  line.type === 'STOCK_IN' &&
  line.numberOfPacks === 0 &&
  !line.shippedNumberOfPacks;

// A top-level (untyped) rejection carries the Rust variant name in
// `extensions.details`; translate it to a human message (falls back to a
// sentence-cased form of the identifier), else the bare GraphQL message.
const untypedRejectionMessage = (errors: GraphqlErrorItem[]): string => {
  const detail = errors[0]?.extensions?.details;
  if (typeof detail === 'string' && detail.length > 0)
    return translateServerError(detail);
  return errors[0]?.message ?? translateServerError('UnknownError');
};

// A header/status update. Returns a discriminated result so a caller can
// surface the server's verdict inline (spec S7 → action verdicts): buffered
// field saves ignore the 'error' case (the UI disables the field when not
// editable, so a rejection there is unexpected), while the status control,
// received-date field, and currency/charges panel show `message` in place.
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
  const result = isExternal
    ? await graphqlFetch(
        UpdateInboundShipmentExternal,
        { storeId, input },
        { returnGraphqlErrors: true }
      )
    : await graphqlFetch(
        UpdateInboundShipment,
        { storeId, input },
        { returnGraphqlErrors: true }
      );
  if (result.kind === 'graphqlError')
    return { kind: 'error', message: untypedRejectionMessage(result.errors) };
  if (result.kind !== 'success') return { kind: 'failed' };
  const response =
    'updateInboundShipmentExternal' in result.data
      ? result.data.updateInboundShipmentExternal
      : result.data.updateInboundShipment;
  if (response.__typename === 'InvoiceNode')
    return { kind: 'saved', node: response };
  return { kind: 'error', message: response.error.description };
};

// Convenience for the buffered field/colour/hold saves: route the (unexpected)
// rejection path away and hand back the fresh node on success. Callers that
// need the rejection message (e.g. backdating the received date) call
// `updateInboundShipment` directly and read its `error` case.
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
  /**
   * A batch-level rejection that aborted the whole (all-or-nothing) batch — an
   * untyped `Bad user input` top-level error (e.g. a future manufacture date or
   * a pack size below one). Not keyed to a line, so the caller shows it as the
   * modal's banner rather than a row indicator.
   */
  message?: string;
};

// Run a line/service-line batch (insert/update/delete + insert-from-internal-
// order), picking the plain vs external twin. All-or-nothing by default
// (continueOnError omitted). Transport/unexpected → null (the global modal
// already showed it). An untyped top-level rejection → a batch-level `message`.
// Otherwise returns which ops applied and any per-line errors.
export const runInboundBatch = async (
  storeId: string,
  isExternal: boolean,
  input: BatchInboundShipmentVariables['input']
): Promise<BatchOutcome | null> => {
  const result = isExternal
    ? await graphqlFetch(
        BatchInboundShipmentExternal,
        { storeId, input },
        { returnGraphqlErrors: true }
      )
    : await graphqlFetch(
        BatchInboundShipment,
        { storeId, input },
        { returnGraphqlErrors: true }
      );
  if (result.kind === 'graphqlError')
    return {
      applied: false,
      errors: new Map(),
      message: untypedRejectionMessage(result.errors),
    };
  if (result.kind !== 'success') return null;
  const batch =
    'batchInboundShipmentExternal' in result.data
      ? result.data.batchInboundShipmentExternal
      : result.data.batchInboundShipment;
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
// rejection on a typed error OR an untyped top-level rejection (message, plus
// the raw text when the server only gave a debug dump), or nothing on
// success/transport-fail (the latter already surfaced globally).
export const deleteInboundShipment = async (
  storeId: string,
  isExternal: boolean,
  id: string
): Promise<{
  ok: boolean;
  message?: string;
  detail?: string;
  forbidden?: true;
}> => {
  const result = isExternal
    ? await graphqlFetch(
        DeleteInboundShipmentExternal,
        { storeId, input: { id } },
        { returnGraphqlErrors: true }
      )
    : await graphqlFetch(
        DeleteInboundShipment,
        { storeId, input: { id } },
        { returnGraphqlErrors: true }
      );
  if (result.kind === 'graphqlError') {
    // Opting into graphql errors also intercepts Forbidden, which owes the user
    // the global permission-denied modal (D38) rather than an inline rejection
    // — a delete they may not perform is not a property of this shipment.
    if (isForbidden(result.errors)) {
      reportPermissionDenied(missingPermissions(result.errors));
      return { ok: false, forbidden: true };
    }
    return { ok: false, ...deleteRejection(result.errors) };
  }
  if (result.kind !== 'success') return { ok: false };
  const response =
    'deleteInboundShipmentExternal' in result.data
      ? result.data.deleteInboundShipmentExternal
      : result.data.deleteInboundShipment;
  if (response.__typename === 'DeleteResponse') return { ok: true };
  return { ok: false, message: response.error.description };
};

// Bulk-add empty stock lines from a master list (spec AC-ML1). Returns the
// count added, or a rejection message (typed member OR untyped top-level).
export const addFromMasterList = async (
  storeId: string,
  shipmentId: string,
  masterListId: string
): Promise<{ ok: boolean; added?: number; message?: string }> => {
  const result = await graphqlFetch(
    AddToInboundShipmentFromMasterList,
    { storeId, input: { shipmentId, masterListId } },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError')
    return { ok: false, message: untypedRejectionMessage(result.errors) };
  if (result.kind !== 'success') return { ok: false };
  const response = result.data.addToInboundShipmentFromMasterList;
  if (response.__typename === 'InvoiceLineConnector')
    return { ok: true, added: response.totalCount };
  if (response.__typename === 'AddToInboundShipmentFromMasterListError')
    return { ok: false, message: response.error.description };
  return { ok: false };
};
