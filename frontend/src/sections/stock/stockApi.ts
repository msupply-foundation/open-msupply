import { graphqlFetch, type GraphqlErrorItem } from '../../api/graphql';
import { t, translateServerError } from '../../intl';
import type { LocaleKey } from '../../intl/locales';
import {
  UpdateStockLine,
  CreateInventoryAdjustment,
  InsertRepack,
  InsertVvmStatusLog,
  UpdateVvmStatusLog,
  type UpdateStockLineVariables,
  type StockLineDetailFragment,
  type CreateInventoryAdjustmentVariables,
  type CreateInventoryAdjustmentResult,
  type InsertRepackVariables,
  type InsertRepackResult,
  type InsertVvmStatusLogVariables,
  type UpdateVvmStatusLogVariables,
} from './detail/stockLine.generated';
import {
  InsertStockLine,
  type InsertStockLineVariables,
} from './list/newStock.generated';

// The ONE place stock mutations run and their rejections are normalised
// (kdd/state-management, kdd/graphql-client). Every stock modal (edit save,
// adjust, new stock, repack, VVM entry) goes through a runner here, so error
// mapping and the success/error/handled-globally discrimination live once.
//
// Two rejection shapes the server uses (spec/stock contract):
//  - TYPED error members inside the union result (a successful GraphQL
//    response whose payload is an *Error branch) — read `error.__typename`.
//  - NON-TYPED rejections as a plain GraphQL error, message "Bad user input"
//    with the identifier in `extensions.details` — caught via
//    returnGraphqlErrors and read from `rejectionDetail`.
// Both map through `stockErrorMessage` to the initiating surface's banner; no
// stock action outcome is ever a toast (spec AC-B1, controls › action
// feedback).

// A mutation outcome the caller renders: ok (proceed / close), error (show the
// message in the modal, keep it open + input preserved), or undefined =
// handled globally (transport / unauthenticated / unexpected — the global modal
// already showed it; the caller just stays in its pending phase).
export type MutationOutcome<T> =
  { kind: 'ok'; data: T } | { kind: 'error'; message: string };

// The rejection identifier from a plain GraphQL error: the contract puts it in
// extensions.details (e.g. "InvalidAdjustment"); fall back to the message.
export const rejectionDetail = (errors: GraphqlErrorItem[]): string => {
  const first = errors[0];
  const details = first?.extensions?.details;
  if (typeof details === 'string' && details.length > 0) return details;
  return first?.message ?? '';
};

// Known rejection identifier (a typed-error __typename OR an extensions.details
// string) → message key. Context-specific copy (the two reason-required
// variants) is supplied by the caller via `overrides`.
const BASE_MESSAGES: Record<string, LocaleKey> = {
  StockLineReducedBelowZero: 'error.stock-reduced-below-zero',
  LedgerWouldGoBelowZero: 'error.ledger-would-go-below-zero',
  AdjustmentReasonNotProvided: 'error.provide-reason-stock-adjustment',
  AdjustmentReasonNotValid: 'error.provide-valid-reason',
  CannotHaveFractionalPack: 'error.repack-cannot-be-fractional',
  InvalidAdjustment: 'error.invalid-adjustment',
  BackdatingNotEnabled: 'error.backdating-not-enabled',
  CannotSetDateInFuture: 'error.date-in-future',
  ExceedsMaximumBackdatingDays: 'error.exceeds-max-backdating-days',
  StockLineAlreadyExists: 'error.stock-line-already-exists',
  StockDoesNotBelongToStore: 'error.stock-not-found',
  NotThisStoreStockLine: 'error.stock-not-found',
  StockLineDoesNotExist: 'error.stock-not-found',
  InvalidStore: 'error.stock-not-found',
  RecordNotFound: 'error.stock-not-found',
};

// Resolve an identifier to a user-facing message. `overrides` wins (e.g. the
// new-stock modal maps AdjustmentReasonNotProvided to the "adding stock" copy;
// the repack modal maps StockLineReducedBelowZero to the repack-specific copy).
// The Internal-error traps (LineInsertError(...) / ForeignKeyViolation) and any
// unmapped identifier fall back to a generic message / a readable form of the
// raw identifier.
export const stockErrorMessage = (
  identifier: string,
  overrides: Record<string, LocaleKey> = {}
): string => {
  const key = overrides[identifier] ?? BASE_MESSAGES[identifier];
  if (key) return t(key);
  if (
    identifier.includes('LineInsertError') ||
    identifier.includes('ForeignKey')
  )
    return t('error.new-stock-invalid');
  return translateServerError(identifier);
};

// Save a partial attribute edit (spec/stock S2). ok → the re-hydrated line.
export const runUpdateStockLine = async (
  storeId: string,
  input: UpdateStockLineVariables['input']
): Promise<MutationOutcome<StockLineDetailFragment> | undefined> => {
  const result = await graphqlFetch(
    UpdateStockLine,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError')
    return {
      kind: 'error',
      message: stockErrorMessage(rejectionDetail(result.errors)),
    };
  if (result.kind !== 'success') return undefined;
  const res = result.data.updateStockLine;
  if (res.__typename === 'StockLineNode') return { kind: 'ok', data: res };
  return { kind: 'error', message: stockErrorMessage(res.error.__typename) };
};

// Introduce a new stock line (spec/stock S3). ok → the new line's id (navigate
// to its detail). Field validations surface as Internal errors (contract trap),
// so the UI pre-validates; anything reaching here maps generically.
export const runInsertStockLine = async (
  storeId: string,
  input: InsertStockLineVariables['input']
): Promise<MutationOutcome<{ id: string }> | undefined> => {
  const result = await graphqlFetch(
    InsertStockLine,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  const overrides: Record<string, LocaleKey> = {
    AdjustmentReasonNotProvided: 'error.provide-reason-new-stock',
  };
  if (result.kind === 'graphqlError')
    return {
      kind: 'error',
      message: stockErrorMessage(rejectionDetail(result.errors), overrides),
    };
  if (result.kind !== 'success') return undefined;
  const res = result.data.insertStockLine;
  if (res.__typename === 'StockLineNode')
    return { kind: 'ok', data: { id: res.id } };
  return {
    kind: 'error',
    message: stockErrorMessage(res.error.__typename, overrides),
  };
};

type AdjustmentInvoice = Extract<
  CreateInventoryAdjustmentResult['createInventoryAdjustment'],
  { __typename: 'InvoiceNode' }
>;

// Apply an inventory adjustment (spec/stock S4). ok → the finalised invoice.
export const runCreateInventoryAdjustment = async (
  storeId: string,
  input: CreateInventoryAdjustmentVariables['input']
): Promise<MutationOutcome<AdjustmentInvoice> | undefined> => {
  const result = await graphqlFetch(
    CreateInventoryAdjustment,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError')
    return {
      kind: 'error',
      message: stockErrorMessage(rejectionDetail(result.errors)),
    };
  if (result.kind !== 'success') return undefined;
  const res = result.data.createInventoryAdjustment;
  if (res.__typename === 'InvoiceNode') return { kind: 'ok', data: res };
  return { kind: 'error', message: stockErrorMessage(res.error.__typename) };
};

type RepackInvoice = Extract<
  InsertRepackResult['insertRepack'],
  { __typename: 'InvoiceNode' }
>;

// Create a repack (spec/stock S5). ok → the repack invoice + the new ("to")
// stock line's id (from its STOCK_IN line), for the full-repack navigation.
export const runInsertRepack = async (
  storeId: string,
  input: InsertRepackVariables['input']
): Promise<
  | MutationOutcome<{ invoice: RepackInvoice; newStockLineId?: string }>
  | undefined
> => {
  const overrides: Record<string, LocaleKey> = {
    StockLineReducedBelowZero: 'error.repack-has-stock-reduced-below-zero',
  };
  const result = await graphqlFetch(
    InsertRepack,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError')
    return {
      kind: 'error',
      message: stockErrorMessage(rejectionDetail(result.errors), overrides),
    };
  if (result.kind !== 'success') return undefined;
  const res = result.data.insertRepack;
  if (res.__typename === 'InvoiceNode') {
    const stockIn = res.lines.nodes.find(l => l.type === 'STOCK_IN');
    return {
      kind: 'ok',
      data: { invoice: res, newStockLineId: stockIn?.stockLine?.id },
    };
  }
  return {
    kind: 'error',
    message: stockErrorMessage(res.error.__typename, overrides),
  };
};

// Record a VVM status change (spec/stock S6). No typed error union — a
// rejection is a plain GraphQL error.
export const runInsertVvmStatusLog = async (
  storeId: string,
  input: InsertVvmStatusLogVariables['input']
): Promise<MutationOutcome<{ id: string }> | undefined> => {
  const result = await graphqlFetch(
    InsertVvmStatusLog,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError')
    return {
      kind: 'error',
      message: stockErrorMessage(rejectionDetail(result.errors)),
    };
  if (result.kind !== 'success') return undefined;
  return { kind: 'ok', data: { id: result.data.insertVvmStatusLog.id } };
};

// Edit a VVM history entry's comment (status fixed).
export const runUpdateVvmStatusLog = async (
  storeId: string,
  input: UpdateVvmStatusLogVariables['input']
): Promise<MutationOutcome<{ id: string }> | undefined> => {
  const result = await graphqlFetch(
    UpdateVvmStatusLog,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError')
    return {
      kind: 'error',
      message: stockErrorMessage(rejectionDetail(result.errors)),
    };
  if (result.kind !== 'success') return undefined;
  return { kind: 'ok', data: { id: result.data.updateVvmStatusLog.id } };
};
