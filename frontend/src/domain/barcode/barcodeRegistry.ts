// Barcodes as the app reads and writes them (spec/barcode-scanning/rules.md
// § Looking a barcode up, § Learning a barcode; wire in contract.md;
// decisions/2026-09-30_barcodes.md).
//
// A confirmed barcode is central's and shared by every site; one barcode can be
// confirmed for several items. A store learns a barcode by proposing it: a user
// picked an item for it, and once the line the scan opened is saved the screen
// calls `proposeBarcode`; it can withdraw a proposal made on its site with
// `withdrawProposal`. Central reviews proposals on the item and confirms,
// moves or removes barcodes. WHEN to look up or propose is each consuming
// screen's decision.

import {
  describeErrors,
  graphqlFetch,
  type GraphqlFailure,
} from '@/api/graphql';
import { t } from '@/intl';
import {
  BarcodeMatches,
  ConfirmBarcodeProposal,
  DeleteBarcode,
  DeleteBarcodeProposal,
  InsertBarcode,
  ProposeBarcode,
  UpdateBarcode,
  type BarcodeFragment,
} from './barcode.generated';

export type { BarcodeFragment };

export type BarcodeLookup =
  /** The barcode matches one item. */
  | { kind: 'known'; barcode: BarcodeFragment }
  /**
   * The barcode matches several items: the user chooses (rules § Looking a
   * barcode up). Confirmed barcodes come first.
   */
  | { kind: 'choose'; barcodes: BarcodeFragment[] }
  /**
   * No match to an item this store can see — the normal first scan of a new
   * product, never shown as a failure.
   */
  | { kind: 'unknown' }
  /**
   * There was no barcode to look up (readScan § scanCode: an empty scan, a
   * structured label without an item number). Nothing was sent.
   */
  | { kind: 'no-code' }
  /** The request failed; already reported globally. */
  | { kind: 'failed' };

/**
 * What a barcode's matches mean for a scan: one item is used; several are a
 * choice. The server sends one match per item, confirmed first.
 */
export const resolveMappings = (barcodes: BarcodeFragment[]): BarcodeLookup => {
  if (barcodes.length === 0) return { kind: 'unknown' };
  if (barcodes.length === 1) return { kind: 'known', barcode: barcodes[0]! };
  return { kind: 'choose', barcodes };
};

/**
 * Look a barcode up. Pass `scanCode(read)` straight in: `undefined` or `''` is
 * answered `no-code` without a request. The barcode is sent as it was read; the
 * server puts it in its standard form (a 13-digit product number matches its
 * 14-digit form).
 */
export const lookUpBarcode = async (
  storeId: string,
  code: string | undefined
): Promise<BarcodeLookup> => {
  if (code === undefined || code === '') return { kind: 'no-code' };
  const result = await graphqlFetch(BarcodeMatches, {
    storeId,
    barcode: code,
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  return resolveMappings(result.data.barcodeMatches);
};

export type BarcodeChange =
  | { kind: 'saved' }
  /** Nothing to save — an empty barcode, or nothing new to learn. */
  | { kind: 'no-code' }
  /**
   * The server refused, or the request failed. `message` is the localised
   * "Unable to save the barcode for this item: …" notice (ui-surface §
   * Notices), for the screen to show beside what it saved.
   */
  | { kind: 'error'; message: string };

const saveError = (result: GraphqlFailure): BarcodeChange => {
  const error =
    result.kind === 'graphqlError'
      ? describeErrors(result.errors)
      : result.kind;
  return {
    kind: 'error',
    message: t('error.unable-to-save-barcode', { error }),
  };
};

const changed = (
  result: { kind: 'success' } | GraphqlFailure
): BarcodeChange =>
  result.kind === 'success' ? { kind: 'saved' } : saveError(result);

export type ProposeInput = {
  /** As scanned or typed. */
  barcode: string;
  itemId: string;
  packSize?: number;
};

/**
 * Learn a barcode: a user picked `itemId` for it in this store. Call it once
 * the line the scan opened is saved. Proposing the same barcode for the same item
 * again updates the store's proposal, and the server does nothing for a
 * barcode already confirmed for the item.
 *
 * Every failure comes back as `error` for the screen to report beside what it
 * saved, not through the global error modal.
 */
export const proposeBarcode = async (
  storeId: string,
  input: ProposeInput
): Promise<BarcodeChange> => {
  const { barcode, itemId, packSize } = input;
  if (barcode.trim() === '') return { kind: 'no-code' };
  const result = await graphqlFetch(
    ProposeBarcode,
    {
      storeId,
      input: {
        barcode,
        itemId,
        ...(packSize === undefined || packSize <= 0 ? {} : { packSize }),
      },
    },
    { returnGraphqlErrors: true }
  );
  return changed(result);
};

/**
 * Withdraw a proposal made by a store on this site, e.g. one that picked the
 * wrong item: scans here stop matching it, and central stops reviewing it. A
 * barcode already confirmed from it stays confirmed.
 */
export const withdrawProposal = async (
  storeId: string,
  id: string
): Promise<BarcodeChange> =>
  changed(
    await graphqlFetch(
      DeleteBarcodeProposal,
      { storeId, id },
      { returnGraphqlErrors: true }
    )
  );

/** Central: confirm a barcode for an item, or bring back a removed one. */
export const addBarcode = async (
  storeId: string,
  input: { barcode: string; itemId: string; packSize?: number }
): Promise<BarcodeChange> => {
  if (input.barcode.trim() === '') return { kind: 'no-code' };
  const result = await graphqlFetch(
    InsertBarcode,
    { storeId, input },
    { returnGraphqlErrors: true }
  );
  return changed(result);
};

/** Central: confirm a store's proposal, so the barcode reaches every site. */
export const confirmProposal = async (
  storeId: string,
  id: string
): Promise<BarcodeChange> =>
  changed(
    await graphqlFetch(
      ConfirmBarcodeProposal,
      { storeId, id },
      { returnGraphqlErrors: true }
    )
  );

/** Central: move a confirmed barcode to another item. */
export const moveBarcode = async (
  storeId: string,
  id: string,
  itemId: string
): Promise<BarcodeChange> =>
  changed(
    await graphqlFetch(
      UpdateBarcode,
      { storeId, input: { id, itemId } },
      { returnGraphqlErrors: true }
    )
  );

/**
 * Central: remove a confirmed barcode everywhere. Lines that had the barcode
 * keep it, and stores proposing it again won't confirm it.
 */
export const removeBarcode = async (
  storeId: string,
  id: string
): Promise<BarcodeChange> =>
  changed(
    await graphqlFetch(
      DeleteBarcode,
      { storeId, id },
      { returnGraphqlErrors: true }
    )
  );
