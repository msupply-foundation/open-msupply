import { graphqlFetch, type GraphqlErrorItem } from '../../../api/graphql';
import { translateServerError } from '../../../intl/intlUtils';
import { t } from '../../../intl';
import {
  AddPurchaseOrderFromMasterList,
  InsertPurchaseOrderLine,
  UpdatePurchaseOrder,
  UpdatePurchaseOrderLine,
  DeletePurchaseOrderLines,
  type InsertPurchaseOrderLineVariables,
  type UpdatePurchaseOrderVariables,
  type UpdatePurchaseOrderLineVariables,
} from './purchaseOrderDetail.generated';

// The mutation runners behind an order's own screen. ONE mutation serves the
// toolbar, the Details heading, the side panel and the state ladder alike, so
// this module is where its three outcomes are sorted out once.
//
// A rejection reaches us two ways (contract § an order's own screen):
//
//  - a TYPED member of the response union — only ever the two LIFECYCLE
//    refusals (`ItemsCannotBeOrdered`, `InboundShipmentsNotVerified`), neither
//    reachable by editing a field;
//  - an UNTYPED top-level `Bad user input`, which is EVERY field-level refusal
//    this screen can provoke: a closed order, an unknown supplier or donor, a
//    party that is not a supplier. The Rust variant name arrives in
//    `extensions.details` and is all that distinguishes one from another.
//
// Every runner opts into `returnGraphqlErrors` so the untyped kind comes back
// as a result we can report rather than tripping the app's global
// unexpected-error modal.

// A top-level (untyped) rejection carries the Rust variant in
// `extensions.details` — the bare name for a unit variant, the whole Debug
// rendering for one carrying data (the line update's duplicate collision) —
// so only the leading identifier is read. Translate it to a human message
// (falling back to a sentence-cased form of the identifier), else the bare
// GraphQL message.
const untypedRejectionMessage = (errors: GraphqlErrorItem[]): string => {
  const detail = errors[0]?.extensions?.details;
  const variant =
    typeof detail === 'string' ? /^\w+/.exec(detail)?.[0] : undefined;
  if (variant) return translateServerError(variant);
  return errors[0]?.message ?? translateServerError('UnknownError');
};

/**
 * The outcome of an update. `blockedLines` carries the lines named by
 * `ItemsCannotBeOrdered` so the table can mark them (spec S18) — a state move
 * is the only thing that can produce it.
 */
export type PurchaseOrderUpdateResult =
  | { kind: 'saved' }
  | { kind: 'error'; message: string; blockedLines?: string[] }
  | { kind: 'failed' };

export const updatePurchaseOrder = async (
  storeId: string,
  input: UpdatePurchaseOrderVariables['input']
): Promise<PurchaseOrderUpdateResult> => {
  const result = await graphqlFetch(
    UpdatePurchaseOrder,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError')
    return { kind: 'error', message: untypedRejectionMessage(result.errors) };
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.updatePurchaseOrder;
  if (response.__typename === 'IdResponse') return { kind: 'saved' };
  const error = response.error;
  return {
    kind: 'error',
    message: error.description,
    // `lines` is a list of error types, each wrapping the line it names.
    blockedLines:
      error.__typename === 'ItemsCannotBeOrdered'
        ? error.lines.map(entry => entry.line.id)
        : undefined,
  };
};

/**
 * Close one line for receipt. There is no bulk line update on the wire, so the
 * action issues this per selected line and folds the outcomes (contract §
 * acting on a selection of lines).
 */
export const updatePurchaseOrderLine = async (
  storeId: string,
  input: UpdatePurchaseOrderLineVariables['input']
): Promise<PurchaseOrderUpdateResult> => {
  const result = await graphqlFetch(
    UpdatePurchaseOrderLine,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError')
    return { kind: 'error', message: untypedRejectionMessage(result.errors) };
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.updatePurchaseOrderLine;
  return response.__typename === 'IdResponse'
    ? { kind: 'saved' }
    : { kind: 'error', message: response.error.description };
};

/**
 * Add a line (spec S10). The duplicate collision is typed on this path and
 * names the item code and pack size the rejection must carry
 * (OMS-FUN-PO-02.8); every other typed refusal reports its description, and
 * the untyped ones — an unknown item, a manufacturer that is not one — their
 * variant.
 */
export const insertPurchaseOrderLine = async (
  storeId: string,
  input: InsertPurchaseOrderLineVariables['input']
): Promise<PurchaseOrderUpdateResult> => {
  const result = await graphqlFetch(
    InsertPurchaseOrderLine,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError')
    return { kind: 'error', message: untypedRejectionMessage(result.errors) };
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.insertPurchaseOrderLine;
  if (response.__typename === 'IdResponse') return { kind: 'saved' };
  const error = response.error;
  return {
    kind: 'error',
    message:
      error.__typename === 'PackSizeCodeCombinationExists'
        ? t('error.purchase-order-line-duplicate', {
            code: error.itemCode,
            packSize: error.requestedPackSize,
          })
        : error.description,
  };
};

/** What a fold over several per-line calls comes to. */
export type LinesOutcome = {
  /** How many lines the server accepted — 0 means nothing changed. */
  applied: number;
  /** The first refusal, to report once rather than per line. */
  message?: string;
};

/**
 * Remove a selection of lines. The mutation is PLURAL and answers one response
 * per id, so a single call can PARTLY succeed — the fold reports how many went
 * and the first refusal (contract § acting on a selection of lines). Its one
 * typed rejection is a missing line; the state gate that makes deletion
 * drafting-only arrives untyped, which is why the surface gates it.
 */
export const deletePurchaseOrderLines = async (
  storeId: string,
  ids: string[]
): Promise<LinesOutcome> => {
  const result = await graphqlFetch(
    DeletePurchaseOrderLines,
    { storeId, ids },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError')
    return { applied: 0, message: untypedRejectionMessage(result.errors) };
  if (result.kind !== 'success') return { applied: 0 };
  let applied = 0;
  let message: string | undefined;
  for (const entry of result.data.deletePurchaseOrderLines) {
    if (entry.response.__typename === 'DeleteResponse') applied += 1;
    else message ??= entry.response.error.description;
  }
  return { applied, message };
};

const foldLineUpdates = async (
  storeId: string,
  inputs: UpdatePurchaseOrderLineVariables['input'][]
): Promise<LinesOutcome> => {
  let applied = 0;
  let message: string | undefined;
  for (const input of inputs) {
    const result = await updatePurchaseOrderLine(storeId, input);
    if (result.kind === 'saved') applied += 1;
    else if (result.kind === 'error') message ??= result.message;
  }
  return { applied, message };
};

/**
 * Close every line in a selection for receipt, one call each. Stops at nothing
 * — a line that refuses is counted as a refusal and the rest still run, since
 * the server offers no bulk form and a partial close is the honest outcome.
 */
export const closePurchaseOrderLines = (
  storeId: string,
  ids: string[]
): Promise<LinesOutcome> =>
  foldLineUpdates(
    storeId,
    ids.map(id => ({ id, status: 'CLOSED' as const }))
  );

export type DeliveryDateField =
  'requestedDeliveryDate' | 'expectedDeliveryDate';

/**
 * Whether the lines carry more than one distinct value of one delivery date —
 * a line with none counts as its own value. Either toolbar date reaches the
 * lines only while they agree on it (rules § the two delivery dates).
 */
export const deliveryDatesVary = (
  lines: Partial<Record<DeliveryDateField, string | null>>[],
  field: DeliveryDateField
): boolean => new Set(lines.map(line => line[field] ?? null)).size > 1;

/**
 * Which line dates a change to `field` reaches: the field itself, and the
 * other date only where the lines still agree on it — per-line values already
 * set there are left alone (rules § the two delivery dates).
 */
export const cascadedDateFields = (
  lines: Partial<Record<DeliveryDateField, string | null>>[],
  field: DeliveryDateField
): DeliveryDateField[] => {
  const other: DeliveryDateField =
    field === 'requestedDeliveryDate'
      ? 'expectedDeliveryDate'
      : 'requestedDeliveryDate';
  return deliveryDatesVary(lines, other) ? [field] : [field, other];
};

/**
 * Write one day onto the given delivery dates of EVERY line. The server does
 * not cascade a bare date change (`update_lines` fills a line's requested date
 * only alongside a status), so the screen issues the per-line writes itself.
 */
export const cascadeDeliveryDates = (
  storeId: string,
  lines: { id: string }[],
  date: string,
  fields: DeliveryDateField[]
): Promise<LinesOutcome> =>
  foldLineUpdates(
    storeId,
    lines.map(line => ({
      id: line.id,
      ...Object.fromEntries(fields.map(field => [field, { value: date }])),
    }))
  );

export type AddFromMasterListResult =
  | { kind: 'done'; added: number }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

/**
 * Apply a master list (spec S14). The rejections read as the spec's fixed copy:
 * a closed order, a missing order, a list the store cannot see, and the
 * catch-all.
 */
export const addPurchaseOrderFromMasterList = async (
  storeId: string,
  purchaseOrderId: string,
  masterListId: string
): Promise<AddFromMasterListResult> => {
  const result = await graphqlFetch(
    AddPurchaseOrderFromMasterList,
    { storeId, input: { purchaseOrderId, masterListId } },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError')
    return { kind: 'error', message: untypedRejectionMessage(result.errors) };
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.addToPurchaseOrderFromMasterList;
  if (response.__typename === 'PurchaseOrderLineConnector')
    return { kind: 'done', added: response.totalCount };
  switch (response.error.__typename) {
    case 'CannotEditPurchaseOrder':
      return { kind: 'error', message: t('label.cannot-edit-purchase-order') };
    case 'RecordNotFound':
      return { kind: 'error', message: t('messages.record-not-found') };
    case 'MasterListNotFoundForThisStore':
      return { kind: 'error', message: t('error.master-list-not-found') };
    default:
      return {
        kind: 'error',
        message: t('label.cannot-add-item-to-purchase-order'),
      };
  }
};
