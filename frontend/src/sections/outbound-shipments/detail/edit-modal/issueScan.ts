// Issuing by scanning (spec/barcode-scanning/rules.md § Learning a code while
// issuing; cases OMS-REG-BAC-01.42–.48). No capture window here: a scan opens
// the ordinary line editor, and the editor carries the scan until its first
// successful save learns the code.
//
// Pure except `resolveIssueScan`, which runs the lookup, and `learnIssueScan`,
// which runs the save; the rest is what the editor does with the answer.

import {
  labelFields,
  lookUpBarcode,
  saveBarcode,
  scanCode,
  type ReadScan,
} from '@/domain/barcode';
import { lookUpItemById } from '@/domain/item';
import type { LineEditItem } from './OutboundLineEditModal';

export type IssueScan = {
  /**
   * The code to learn on save — the label's item number, else the raw
   * content (readScan § scanCode). Undefined where the scan has none: it is
   * then neither looked up nor learned.
   */
  code?: string;
  /**
   * The book already knows the code, so saving does not re-save it (.47).
   */
  known: boolean;
  /**
   * The item the code resolved to, opened locked (.42). Absent → the editor
   * opens with the item empty and choosable, warning that nothing matched
   * (.43).
   */
  item?: LineEditItem;
  /** The label's batch, narrowing which stock may be issued (.44/.45). */
  batch?: string;
};

/**
 * Look the scan up and resolve the item it names. Undefined when either
 * request failed — already reported globally, and nothing should open.
 *
 * A code the book knows whose item this store cannot see (the book is not a
 * catalogue — rules § Looking a code up) opens like an unknown one: there is
 * no item to lock the editor to. It still counts as known, so the save does
 * not re-point it.
 */
export const resolveIssueScan = async (
  storeId: string,
  scan: ReadScan
): Promise<IssueScan | undefined> => {
  const code = scanCode(scan);
  const { batch } = labelFields(scan);
  const lookup = await lookUpBarcode(storeId, code);
  switch (lookup.kind) {
    case 'failed':
      return undefined;
    case 'no-code':
      return { known: false, batch };
    case 'unknown':
      return { code, known: false, batch };
    case 'known': {
      const found = await lookUpItemById(storeId, lookup.barcode.itemId);
      if (found.kind === 'failed') return undefined;
      // An ItemOption is a LineEditItem (structurally a superset).
      const item = found.kind === 'found' ? found.item : undefined;
      return { code, known: true, item, batch };
    }
  }
};

/**
 * The batches a scanned batch rules out (.44): every other batch of the item
 * — but only where the item holds that batch at all. A label naming a batch
 * this store has never held leaves every batch available (.45), so the user
 * is not left with nothing to issue (old-app parity, StockOut
 * scannedBatchFilter).
 *
 * A batch the shipment already issues from (`numberOfPacks` as loaded) is
 * never ruled out. Excluding it would lock its row and let the next
 * distribution zero it, and the set-save would then delete a line the user
 * never touched. The old app loses those lines on save the same way; this
 * deliberately does not.
 */
export const scannedBatchExclusions = (
  lines: readonly {
    id: string;
    batch?: string | null;
    numberOfPacks: number;
  }[],
  batch: string | undefined
): Set<string> => {
  if (batch === undefined || !lines.some(line => line.batch === batch))
    return new Set();
  return new Set(
    lines
      .filter(line => line.batch !== batch && line.numberOfPacks === 0)
      .map(line => line.id)
  );
};

/**
 * The pack size a learned code is saved at: the first saved batch that
 * actually issued something. Undefined where the save issued nothing, so
 * the book keeps whatever pack size it had (contract § Learning a code while
 * issuing).
 */
export const learnedPackSize = (
  lines: readonly { numberOfPacks: number; packSize: number }[]
): number | undefined => lines.find(line => line.numberOfPacks > 0)?.packSize;

/**
 * What a successful save teaches the book (.46–.47): the scan's code against
 * the saved item, at `learnedPackSize`. Undefined — nothing to save — for a
 * code the book already knows (.47) and for a scan with no code.
 */
export const barcodeToLearn = (
  scan: IssueScan | undefined,
  itemId: string,
  savedLines: readonly { numberOfPacks: number; packSize: number }[]
): { gtin: string; itemId: string; packSize?: number } | undefined => {
  if (!scan?.code || scan.known) return undefined;
  return { gtin: scan.code, itemId, packSize: learnedPackSize(savedLines) };
};

/**
 * Learn the scan's code once the line has saved (.46): `barcodeToLearn`'s
 * input, sent to the book. Resolves to the notice to report where learning
 * failed (.48), else undefined — nothing to learn (.47), or learned. It only
 * ever writes the book, so a failure leaves the saved line standing.
 */
export const learnIssueScan = async (
  storeId: string,
  scan: IssueScan | undefined,
  itemId: string,
  savedLines: readonly { numberOfPacks: number; packSize: number }[]
): Promise<string | undefined> => {
  const input = barcodeToLearn(scan, itemId, savedLines);
  if (!input) return undefined;
  const saved = await saveBarcode(storeId, input);
  return saved.kind === 'error' ? saved.message : undefined;
};
