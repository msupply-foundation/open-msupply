// The barcode registry — "the book" — as the app reads and writes it
// (spec/barcode-scanning/rules.md § Looking a code up, § The book's key and
// what a save does; wire in contract.md).
//
// Two calls, and nothing else: the schema has no list, no delete and no edit
// (rules § The book has no maintenance surface). WHEN to look up or learn is
// each consuming screen's decision — receiving, issuing and the stock line
// each run a different part of the cycle — so none of that lives here.

import { describeErrors, graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import {
  BarcodeByGtin,
  InsertBarcode,
  type BarcodeFragment,
  type InsertBarcodeVariables,
} from './barcode.generated';

export type { BarcodeFragment };

export type BarcodeLookup =
  /** The code is in the book. */
  | { kind: 'known'; barcode: BarcodeFragment }
  /**
   * The code is not in the book — the normal first scan of a new product,
   * never shown as a failure (rules § Looking a code up).
   */
  | { kind: 'unknown' }
  /**
   * There was no code to look up (readScan § scanCode: an empty scan, a
   * structured label without an item number). Nothing was sent.
   */
  | { kind: 'no-code' }
  /** The request failed; already reported globally. */
  | { kind: 'failed' };

/**
 * Look a code up. Pass `scanCode(read)` straight in: `undefined` or `''` is
 * answered `no-code` without a request, because the server would match — and
 * return — an empty-coded row if one exists (contract § Looking a code up,
 * wire trap; OMS-REG-BAC-01.68).
 *
 * The match is exact, so the code is sent exactly as given — no trimming, no
 * re-padding a retail GTIN to 14 digits.
 */
export const lookUpBarcode = async (
  storeId: string,
  code: string | undefined
): Promise<BarcodeLookup> => {
  if (code === undefined || code === '') return { kind: 'no-code' };
  const result = await graphqlFetch(
    BarcodeByGtin,
    { storeId, gtin: code },
    {
      // A miss arrives as the NodeError branch (contract wire trap), so only
      // an error OTHER than RecordNotFound is a real failure.
      mapSuccessToError: data => {
        const response = data.barcodeByGtin;
        return response.__typename === 'NodeError' &&
          response.error.__typename !== 'RecordNotFound'
          ? response.error.description
          : undefined;
      },
    }
  );
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.barcodeByGtin;
  return response.__typename === 'BarcodeNode'
    ? { kind: 'known', barcode: response }
    : { kind: 'unknown' };
};

export type BarcodeSave =
  | { kind: 'saved'; barcode: BarcodeFragment }
  /** Nothing to save — an empty code (see saveBarcode). */
  | { kind: 'no-code' }
  /**
   * The server refused, or the request failed. `message` is the localised
   * "Unable to save the barcode for this item: …" notice (ui-surface §
   * Notices). Never global: saving a code is always the by-product of a
   * save the user actually asked for, which has already succeeded.
   */
  | { kind: 'error'; message: string };

/**
 * Teach the book a code: an upsert on the code, which re-points an existing
 * row to `itemId` silently (rules § The book's key). `packSize` overwrites
 * when given and is kept when omitted.
 *
 * An empty code is refused here rather than sent, because the server stores
 * it as a real row that every later empty lookup would then resolve
 * (contract wire trap).
 *
 * Every failure — including a user who may save the line but lacks the
 * permission to change the item catalogue (rules § Permissions) — comes back
 * as `error` for the screen to report beside the line it saved, not through
 * the global error or permission-denied modal.
 */
export const saveBarcode = async (
  storeId: string,
  input: InsertBarcodeVariables['input']
): Promise<BarcodeSave> => {
  if (input.gtin === '') return { kind: 'no-code' };
  const result = await graphqlFetch(
    InsertBarcode,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'success')
    return { kind: 'saved', barcode: result.data.insertBarcode };
  const error =
    result.kind === 'graphqlError'
      ? describeErrors(result.errors)
      : result.kind;
  return {
    kind: 'error',
    message: t('error.unable-to-save-barcode', { error }),
  };
};
