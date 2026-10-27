// Issuing by scanning (spec/barcode-scanning/rules.md § Issuing by scanning;
// cases OMS-REG-BAC-01.42–.44, .139–.141, .171, .182). No capture window here: a scan opens
// the ordinary line editor, and the editor carries the scan until its first
// successful save, which sends the barcode with the lines — the server records
// it on them — and then proposes it for the item (`proposeIssuedBarcode`).
// Shared by every screen that issues by scanning — the outbound shipment
// and the dispensing record — so each runs the same half of the cycle
// (createIssueScanHost is the screen side).
//
// Pure except `resolveIssueScan`, which runs the lookups; the rest is what the
// editor does with the answer.

import { lookUpItemById } from '@/domain/item';
import { lookUpBarcode, proposeBarcode } from './barcodeRegistry';
import type { BarcodeChooser } from './createBarcodeChooser';
import {
  itemNumber,
  labelFields,
  sameBarcode,
  scanCode,
  type ReadScan,
} from './readScan';

/**
 * The item a scan resolved to, as a line editor opens on it: enough for the
 * locked picker's label and the editor's unit and doses lens. Every issuing
 * editor's own item shape is a superset.
 */
export type IssueScanItem = {
  id: string;
  code: string;
  name: string;
  unitName?: string | null;
  isVaccine?: boolean;
  doses?: number;
};

export type IssueScan = {
  /**
   * The barcode to send with the save (.139): a mapped barcode, or an unknown
   * one where it is a real item number — a structured label's item number, or
   * a retail barcode (readScan § itemNumber). Other unknown raw content was
   * looked up but is never sent (.140): it is as likely to be a shipment
   * number as an item identifier. Undefined too where the scan had no code at
   * all (.67).
   */
  code?: string;
  /** The barcode is mapped to an item this store can see. */
  known: boolean;
  /**
   * The item the code resolved to, opened locked (.42). Absent → the editor
   * opens with the item empty and choosable, warning that nothing matched
   * (.43).
   */
  item?: IssueScanItem;
  /** The label's batch, narrowing which stock may be issued (.44). */
  batch?: string;
  /**
   * The code means an item this store has, but outside the scope the editor
   * searches (a dispensing record's program, .169). No item to lock to, so
   * the editor opens empty like an unknown code, but it says which item the
   * code means and why it was not opened, rather than "no matching item".
   */
  outsideScope?: { code: string; name: string };
};

/**
 * After the editor's save: propose the scan's barcode for the item the lines
 * were saved for (rules § Learning a barcode). The lines are saved whatever happens here, so a failure is
 * only worth a notice — it is learned the next time it's saved.
 */
export const proposeIssuedBarcode = async (
  storeId: string,
  scan: IssueScan | undefined,
  itemId: string
) =>
  scan?.code
    ? proposeBarcode(storeId, { barcode: scan.code, itemId })
    : ({ kind: 'no-code' } as const);

/**
 * Look the scan up and resolve the item it names. Undefined when a request
 * failed — already reported globally — or the user closed the item chooser:
 * nothing should open.
 *
 * A barcode matching several items asks the user which one, through
 * `chooser` (rules § Looking a barcode up).
 *
 * `masterListId` scopes the item the way the editor's own item search is
 * scoped (a dispensing record's program — spec/prescriptions rules §
 * creation). An item outside it opens like an unknown barcode: the label must
 * not reach an item the user could not have picked by hand.
 */
export const resolveIssueScan = async (
  storeId: string,
  scan: ReadScan,
  options: { masterListId?: string; chooser?: BarcodeChooser } = {}
): Promise<IssueScan | undefined> => {
  const code = scanCode(scan);
  const { batch } = labelFields(scan);
  const lookup = await lookUpBarcode(storeId, code);
  switch (lookup.kind) {
    case 'failed':
      return undefined;
    case 'no-code':
      // A label naming no item opens no batch narrowing either: there's no
      // item's stock to narrow yet. A batch label narrows an editor already
      // open on an item (createIssueScanHost).
      return { known: false };
    case 'unknown':
      // Sent only where it is an item number — the same test receiving
      // applies (rules § Issuing by scanning).
      return { code: itemNumber(scan), known: false, batch };
    case 'choose': {
      if (!options.chooser)
        return { code: itemNumber(scan), known: false, batch };
      const choice = await options.chooser.choose(storeId, lookup.barcodes, {
        masterListId: options.masterListId,
      });
      if (choice.kind === 'cancelled' || choice.kind === 'failed')
        return undefined;
      if (choice.kind === 'none')
        return { code: itemNumber(scan), known: false, batch };
      return {
        code,
        known: true,
        item: choice.item,
        batch,
      };
    }
    case 'known': {
      const found = await lookUpItemById(storeId, lookup.barcode.itemId, {
        masterListId: options.masterListId,
      });
      if (found.kind === 'failed') return undefined;
      // An ItemOption is an IssueScanItem (structurally a superset).
      if (found.kind === 'found')
        return { code, known: true, item: found.item, batch };
      // Missing within the scope: ask again without it, to tell "outside
      // the program" from "not in this store". If that asking fails, fall
      // back to the plain no-match open rather than opening nothing.
      if (options.masterListId) {
        const unscoped = await lookUpItemById(storeId, lookup.barcode.itemId);
        if (unscoped.kind === 'found') {
          const { code: itemCode, name } = unscoped.item;
          return {
            code,
            known: true,
            item: undefined,
            batch,
            outsideScope: { code: itemCode, name },
          };
        }
      }
      return { code, known: true, item: undefined, batch };
    }
  }
};

/**
 * The item's stock a scan rules out (.44, .190): rows of another batch than
 * the label's, and rows carrying a DIFFERENT barcode from the scan's — they
 * came in another product's box. Stock with no barcode stays: it may have
 * been received by hand from the same box.
 *
 * A narrowing is a default the user can clear (.211, "Show all"), so it
 * needs no fallback: where it rules out everything, the editor says so and
 * offers the rest.
 *
 * A row the record already issues from (`numberOfPacks` as loaded) is never
 * ruled out. Excluding it would lock its row and let the next distribution
 * zero it, and the set-save would then delete a line the user never touched.
 */
export const scanExclusions = (
  lines: readonly {
    id: string;
    batch?: string | null;
    barcode?: string | null;
    numberOfPacks: number;
  }[],
  scan: Pick<IssueScan, 'batch' | 'code'> | undefined
): Set<string> => {
  const batch = scan?.batch;
  const code = scan?.code;
  return new Set(
    lines
      .filter(
        line =>
          line.numberOfPacks === 0 &&
          ((batch !== undefined && (line.batch ?? '') !== batch) ||
            (code !== undefined &&
              !!line.barcode &&
              !sameBarcode(line.barcode, code)))
      )
      .map(line => line.id)
  );
};

/**
 * A batch label scanned into an editor already open on an item (.192): the
 * rows it rules out, judged on each row's packs AS SEEDED — a quantity the
 * user entered since keeps no row in — and whether a row it rules out now
 * holds packs, in which case the entered quantity is redistributed onto the
 * batch the label named.
 */
export const batchLabelNarrowing = (
  lines: readonly {
    id: string;
    batch?: string | null;
    barcode?: string | null;
    numberOfPacks: number;
  }[],
  seededPacksById: ReadonlyMap<string, number>,
  scan: Pick<IssueScan, 'batch' | 'code'>
): { excluded: Set<string>; redistribute: boolean } => {
  const excluded = scanExclusions(
    lines.map(line => ({
      ...line,
      numberOfPacks: seededPacksById.get(line.id) ?? 0,
    })),
    scan
  );
  return {
    excluded,
    redistribute: lines.some(
      line => excluded.has(line.id) && line.numberOfPacks > 0
    ),
  };
};
