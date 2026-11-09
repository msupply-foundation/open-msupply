import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
  type GraphqlErrorItem,
} from '@/api/graphql';
import { t, type LocaleKey } from '@/intl';
import {
  UpdateStockMovement,
  DeleteStockMovement,
  type StockMovementInfoFragment,
  type UpdateStockMovementVariables,
} from './stockMovementDetail.generated';
import type { MovementStatus } from './stockMovementStatus';

// Document-level mutations, split by how their errors are handled (the
// returnUpdate convention):
//
// - saveComment — the one header field. On an editable movement it can't
//   produce a domain rejection the user must act on; failures take the
//   global unexpected-error path.
//
// - advanceStatus — the action with user-facing rejections. The typed pair
//   (NotEnoughStock / LocationOnHold — contract § finalise) arrive on the
//   response union and show their description; everything else is a
//   NON-typed GraphQL error (MovementHasNoLines, CannotReverseStatus, the
//   LineValidation dumps) mapped by substring to translated copy.
//
// - deleteMovement — all rejections non-typed (contract § deletion).

type UpdateInput = UpdateStockMovementVariables['input'];

export const saveComment = async (
  storeId: string,
  input: UpdateInput
): Promise<StockMovementInfoFragment | undefined> => {
  const result = await graphqlFetch(
    UpdateStockMovement,
    { storeId, input },
    {
      // A typed error on a comment save "can't happen" (the typed members are
      // finalise-time line faults) — promote it to the global modal.
      mapSuccessToError: data =>
        data.updateStockRelocation.__typename === 'UpdateStockRelocationError'
          ? data.updateStockRelocation.error.description
          : undefined,
    }
  );
  if (result.kind !== 'success') return undefined;
  const response = result.data.updateStockRelocation;
  return response.__typename === 'StockRelocationNode' ? response : undefined;
};

// The non-typed rejection names the server debug-prints into
// extensions.details (contract § status lifecycle / § finalise) — matched by
// substring so the nested LineValidation dumps still resolve.
const ADVANCE_ERROR_KEYS: Record<string, LocaleKey> = {
  MovementHasNoLines: 'messages.no-lines',
  CannotReverseStatus: 'error.not-editable',
  StockRelocationFinalised: 'error.not-editable',
};

const matchDetails = (errors: GraphqlErrorItem[]): LocaleKey | undefined => {
  for (const e of errors) {
    const details = e.extensions?.details;
    if (typeof details !== 'string') continue;
    for (const [name, key] of Object.entries(ADVANCE_ERROR_KEYS)) {
      if (details.includes(name)) return key;
    }
  }
  return undefined;
};

export type AdvanceResult =
  | { kind: 'saved'; node: StockMovementInfoFragment }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const advanceStatus = async (
  storeId: string,
  id: string,
  status: MovementStatus
): Promise<AdvanceResult> => {
  const result = await graphqlFetch(
    UpdateStockMovement,
    { storeId, input: { id, status } },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') {
    // returnGraphqlErrors suppressed the default Forbidden routing — a
    // server-rejected write surfaces through the global permission-denied
    // modal (D38), never inline.
    if (isForbidden(result.errors)) {
      reportPermissionDenied(missingPermissions(result.errors));
      return { kind: 'failed' };
    }
    const key = matchDetails(result.errors);
    return { kind: 'error', message: key ? t(key) : result.message };
  }
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.updateStockRelocation;
  if (response.__typename === 'StockRelocationNode')
    return { kind: 'saved', node: response };
  // The typed finalise rejections (NotEnoughStock / LocationOnHold) — show
  // the description; the offending line id is not carried on the wire
  // (contract § finalise), so there is no row to stamp.
  return { kind: 'error', message: response.error.description };
};

export type DeleteMovementResult =
  | { kind: 'deleted' }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string }
  | { kind: 'failed' };

export const deleteMovement = async (
  storeId: string,
  id: string
): Promise<DeleteMovementResult> => {
  const result = await graphqlFetch(
    DeleteStockMovement,
    { storeId, input: { id } },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'graphqlError') {
    if (isForbidden(result.errors)) {
      reportPermissionDenied(missingPermissions(result.errors));
      return { kind: 'forbidden' };
    }
    return { kind: 'error', message: result.message };
  }
  if (result.kind !== 'success') return { kind: 'failed' };
  return { kind: 'deleted' };
};
