import { graphqlFetch } from '../../../../api/graphql';
import { t, type LocaleKey } from '../../../../intl';
import { localIsoDaysAgo } from '../../../../ui/elements/inputs/dateTimeConvert';
import {
  InsertInternalOrder,
  InsertProgramInternalOrder,
  RecentStocktakeItems,
} from './createInternalOrder.generated';

// The create-modal mutations and the recent-stocktake warning read
// (spec/internal-orders S2 / § Creation). Both creates return the new order's
// id (to navigate to it) or a user-facing error; the id is client-generated.

// Default general thresholds hard-coded by the create modal (contract ›
// creation): reorder 0, target 1 month.
const GENERAL_MIN_MONTHS_OF_STOCK = 0;
const GENERAL_MAX_MONTHS_OF_STOCK = 1;

export type CreateResult =
  | { kind: 'created'; id: string }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

// General create (AC-C2): sends only id + otherPartyId with the default
// thresholds. The picker offers only visible, store-backed suppliers, so the
// typed supplier rejections are unreachable (contract wire trap) and any
// non-success falls through to the generic mutation path (the global
// unexpected-error modal) — hence no returnGraphqlErrors here.
export const createGeneralOrder = async (
  storeId: string,
  supplierId: string
): Promise<CreateResult> => {
  const result = await graphqlFetch(InsertInternalOrder, {
    storeId,
    input: {
      id: crypto.randomUUID(),
      otherPartyId: supplierId,
      minMonthsOfStock: GENERAL_MIN_MONTHS_OF_STOCK,
      maxMonthsOfStock: GENERAL_MAX_MONTHS_OF_STOCK,
    },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.insertRequestRequisition;
  if (response.__typename === 'RequisitionNode')
    return { kind: 'created', id: response.id };
  return { kind: 'error', message: t('error.unable-to-create-requisition') };
};

// The typed program-create rejections the client maps to copy (contract ›
// creation); every other failure is the generic "unable to create".
const PROGRAM_ERROR_KEYS: Record<string, LocaleKey> = {
  MaxOrdersReachedForPeriod: 'error.max-orders-reached-for-period',
  SupplierNotValid: 'error.program-not-valid-for-supplier',
};

// Program create (AC-P3): sends the order type + period; the resolver fills the
// rest. Any rejection must keep the dialog open showing the error (AC-P5), so
// returnGraphqlErrors surfaces the untyped rejections (already-exists, missing
// order type) as an inline generic message rather than the global modal.
export const createProgramOrder = async (
  storeId: string,
  supplierId: string,
  programOrderTypeId: string,
  periodId: string
): Promise<CreateResult> => {
  const result = await graphqlFetch(
    InsertProgramInternalOrder,
    {
      storeId,
      input: {
        id: crypto.randomUUID(),
        otherPartyId: supplierId,
        programOrderTypeId,
        periodId,
      },
    },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'success') {
    const response = result.data.insertProgramRequestRequisition;
    if (response.__typename === 'RequisitionNode')
      return { kind: 'created', id: response.id };
    const key = PROGRAM_ERROR_KEYS[response.error.__typename];
    return {
      kind: 'error',
      message: t(key ?? 'error.unable-to-create-requisition'),
    };
  }
  if (result.kind === 'graphqlError')
    return { kind: 'error', message: t('error.unable-to-create-requisition') };
  // Forbidden / transport / unexpected already surfaced globally.
  return { kind: 'failed' };
};

// The recent-stocktake warning test (AC-C5): true when the store's finalised
// stocktakes within maxAge days cover fewer than minItems DISTINCT items — so
// New order must confirm before opening the modal. Called only when the
// preference is enabled. A failed read never blocks creation (returns false).
export const recentStocktakeIsInsufficient = async (
  storeId: string,
  maxAge: number,
  minItems: number
): Promise<boolean> => {
  const result = await graphqlFetch(RecentStocktakeItems, {
    storeId,
    onOrAfter: localIsoDaysAgo(maxAge),
  });
  if (result.kind !== 'success') return false;
  const items = new Set<string>();
  for (const stocktake of result.data.stocktakes.nodes)
    for (const line of stocktake.lines.nodes) items.add(line.itemId);
  return items.size < minItems;
};
