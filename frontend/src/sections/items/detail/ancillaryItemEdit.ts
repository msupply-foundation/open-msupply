import { t } from '../../../intl';
import type {
  UpsertAncillaryItemResult,
  UpsertAncillaryItemVariables,
} from './ancillaryItemMutations.generated';

// Pure logic for the ancillary-item edit modal (spec/items S5, rules.md §
// ancillary supplies). Colocated + pure so the ratio/validity/error-mapping
// rules are unit-tested without the screen — mirrors locations'
// locationEdit.ts.

export type DraftAncillaryItem = {
  ancillaryItemId: string | null;
  /** Left-hand side of the x:y ratio (principal count). */
  itemQuantity: number;
  /** Right-hand side of the x:y ratio (ancillary count). */
  ancillaryQuantity: number;
};

export const EMPTY_FORM: DraftAncillaryItem = {
  ancillaryItemId: null,
  itemQuantity: 1,
  ancillaryQuantity: 1,
};

// OMS-REG-CAT-08.4 (ratio sides > 0) + the item picker's own exclusion of the
// principal (client mirror of OMS-REG-CAT-08.6 — self-link is also
// server-guarded, but this keeps Save disabled before a doomed request).
export const isFormValid = (
  form: DraftAncillaryItem,
  principalItemId: string
): boolean =>
  form.itemQuantity > 0 &&
  form.ancillaryQuantity > 0 &&
  !!form.ancillaryItemId &&
  form.ancillaryItemId !== principalItemId;

export const buildUpsertInput = (
  form: DraftAncillaryItem,
  principalItemId: string,
  id: string
): UpsertAncillaryItemVariables['input'] => ({
  id,
  itemId: principalItemId,
  ancillaryItemId: form.ancillaryItemId!,
  itemQuantity: form.itemQuantity,
  ancillaryQuantity: form.ancillaryQuantity,
});

type UpsertError = Extract<
  UpsertAncillaryItemResult['centralServer']['ancillaryItem']['upsertAncillaryItem'],
  { __typename: 'UpsertAncillaryItemError' }
>['error'];

export type SaveRejection =
  | { kind: 'duplicate' }
  | { kind: 'cycle' }
  | { kind: 'maxDepth'; max: number; actual: number }
  | { kind: 'other'; description: string };

// The three typed rejections get the case's own copy
// (error.duplicate-ancillary-item / .ancillary-cycle-detected /
// .ancillary-max-depth-exceeded); everything else (DatabaseError/InternalError)
// shows the server's own description untranslated — confirmed against the real
// app's useUpsertAncillaryItem.ts translateError, which does exactly this (no
// generic "failed to save" key exists or is needed).
export const saveRejection = (error: UpsertError): SaveRejection => {
  switch (error.__typename) {
    case 'DuplicateAncillaryItem':
      return { kind: 'duplicate' };
    case 'AncillaryCycleDetected':
      return { kind: 'cycle' };
    case 'AncillaryMaxDepthExceeded':
      return { kind: 'maxDepth', max: error.max, actual: error.actual };
    default:
      return { kind: 'other', description: error.description };
  }
};

export const rejectionMessage = (rejection: SaveRejection): string => {
  switch (rejection.kind) {
    case 'duplicate':
      return t('error.duplicate-ancillary-item');
    case 'cycle':
      return t('error.ancillary-cycle-detected');
    case 'maxDepth':
      return t('error.ancillary-max-depth-exceeded', {
        max: rejection.max,
        actual: rejection.actual,
      });
    case 'other':
      return rejection.description;
  }
};

// Render the stored x:y pair for table display (ported from the real app's
// ratio.ts) — trims each side to 4 decimals, preserving the entered ratio
// exactly rather than round-tripping through a single decimal.
const trim = (n: number) => Number(n.toFixed(4)).toString();
export const formatRatio = (
  itemQuantity: number,
  ancillaryQuantity: number
): string => `${trim(itemQuantity)}:${trim(ancillaryQuantity)}`;
