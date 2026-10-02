// Receiving by scanning — the capture window's logic (spec/barcode-scanning
// rules.md § Learning a code while receiving; ui-surface.md § S2; cases
// OMS-REG-BAC-01.30–.41, .102, .103, .108, .110).
//
// Pure: what a scan puts in the window, which line it matches, which message
// the window shows, and what a save writes — to the shipment and to the book.
// The window (CaptureWindow.tsx) owns the requests and the timing.

import {
  itemNumber,
  labelFields,
  type BarcodeLookup,
  type ReadScan,
} from '@/domain/barcode';
import type { ItemOption } from '@/domain/item';
import type { BatchInboundShipmentVariables } from '../inboundShipmentDetail.generated';

/** A scan as the window receives it — never an unreadable one. */
export type CaptureRead = Exclude<ReadScan, { kind: 'unreadable' }>;

/** What the window knows about the item in its Item field. */
export type CaptureItem = Pick<
  ItemOption,
  'id' | 'code' | 'name' | 'defaultPackSize' | 'defaultSellPricePerPack'
>;

/** The six fields of the window, plus what the scan decided about them. */
export type CaptureDraft = {
  item: CaptureItem | undefined;
  batch: string;
  /** `YYYY-MM-DD`. */
  expiryDate: string | null;
  packSize: number;
  quantity: number;
  /** `YYYY-MM-DD`. */
  manufactureDate: string | null;
  /** The code resolved to an item: the Item field is locked (.31). */
  itemLocked: boolean;
  /**
   * The resolved entry carried a pack size: Pack size is locked on it, and
   * shows it (.32, .108).
   */
  packSizeLocked: boolean;
  /**
   * The scan carried an item number — a label's `01`, or a retail barcode.
   * Only such a code is worth learning (.70), and it drives the message.
   */
  itemNumber: string | undefined;
  /**
   * The book knows the code, whether or not its item resolved in this store.
   * A known code whose item this store cannot see opens unlocked, like an
   * unknown one, but is never re-pointed (it is not learned) — so the
   * message must not promise to save it.
   */
  codeKnown: boolean;
  /**
   * The code to teach the book on save, where the code was unknown and is a
   * real item number (rules: "An unknown code is only worth learning when it
   * is a real item number"). Undefined otherwise.
   */
  learnCode: string | undefined;
  /** The raw scan, for the manual-input diagnostic readout. */
  content: string;
};

/** The line already on the shipment a draft would add to. */
export type MatchableLine = {
  id: string;
  batch?: string | null;
  packSize: number;
  numberOfPacks: number;
  expiryDate?: string | null;
  manufactureDate?: string | null;
};

/**
 * A new line's pack size (.102, .108): the book's, else the label's, else the
 * item's default — 1 only where the item has no default at all.
 */
export const packSizeFor = (
  item: CaptureItem | undefined,
  bookPackSize: number | undefined,
  labelPackSize: number | undefined
): number =>
  bookPackSize ??
  labelPackSize ??
  (item && item.defaultPackSize > 0 ? item.defaultPackSize : 1);

/**
 * The window a scan opens (.30–.33). Item and pack size come from the book
 * where the code resolved, and are locked there; batch, dates and quantity
 * come from the label and stay editable (.20).
 *
 * Pack size follows packSizeFor: where the book and the label both carry one
 * the field locks on the book's AND shows it (.108 — the current app's
 * defect `.62`, fixed rather than reproduced).
 *
 * Every scan starts on an empty window (a scan-on saves and clears first),
 * so no item has been chosen before it: an unknown item number is always
 * learnable here (rules: "learned only if the user had not already chosen an
 * item before the scan").
 *
 * `item` is the book entry's item, resolved in this store — undefined where
 * the code is not known or its item cannot be seen here. A failed lookup
 * (already reported globally) opens like a scan with no code: item
 * unresolved and nothing to learn. The entry's pack size locks only where
 * its item resolved; otherwise it would lock a hand-picked item to another
 * item's pack size.
 */
export const draftFromScan = (
  read: CaptureRead,
  lookup: BarcodeLookup,
  item: CaptureItem | undefined
): CaptureDraft => {
  const fields = labelFields(read);
  const known = lookup.kind === 'known' ? lookup.barcode : undefined;
  const resolved = known ? item : undefined;
  const entryPackSize =
    resolved && known?.packSize != null && known.packSize > 0
      ? known.packSize
      : undefined;
  const number = itemNumber(read);
  return {
    item: resolved,
    batch: fields.batch ?? '',
    expiryDate: fields.expiryDate ?? null,
    packSize: packSizeFor(resolved, entryPackSize, fields.packSize),
    quantity: fields.quantity ?? 0,
    manufactureDate: fields.manufactureDate ?? null,
    itemLocked: resolved !== undefined,
    packSizeLocked: entryPackSize !== undefined,
    itemNumber: number,
    codeKnown: known !== undefined,
    learnCode: lookup.kind === 'unknown' ? number : undefined,
    content: read.content,
  };
};

/**
 * Pick an item by hand (unknown code, or no code). Pack size follows
 * packSizeFor — the label's, else the item's default — unless it is locked
 * by the book.
 */
export const chooseItem = (
  draft: CaptureDraft,
  item: CaptureItem | undefined,
  labelPackSize: number | undefined
): CaptureDraft => ({
  ...draft,
  item,
  packSize: draft.packSizeLocked
    ? draft.packSize
    : packSizeFor(item, undefined, labelPackSize),
});

/**
 * Whether a scan onto the entry on screen saves it and starts the next (.37)
 * rather than joining it (.186): only where the entry and the scan both
 * carry an item number — box after box. Anything else is the rest of the
 * same box, so a box printed with two barcodes, the product's and a batch
 * and expiry label, composes one line in either order.
 */
export const scansOn = (entry: CaptureDraft, read: CaptureRead): boolean =>
  entry.itemNumber !== undefined && itemNumber(read) !== undefined;

/**
 * A scan joining the entry on screen (.186–.189). Each value the scan's label
 * supplies replaces the entry's; the rest — including anything the user typed
 * — stays. Where the scan's code resolved an item, that item comes in, locked,
 * with the book's pack size; otherwise the entry keeps its own. The scan's
 * item number becomes the entry's where the entry had none, and is learned
 * only if no item had been chosen before it (rules: "A code is learned only
 * if the user had not already chosen an item before the scan").
 *
 * `next` is the scan's own draft (draftFromScan); `labelPackSize` the pack
 * size the entry's labels stated so far.
 */
export const joinScan = (
  entry: CaptureDraft,
  next: CaptureDraft,
  read: CaptureRead,
  labelPackSize: number | undefined
): CaptureDraft => {
  const fields = labelFields(read);
  const resolved = next.item;
  const packSize = resolved
    ? next.packSizeLocked
      ? next.packSize
      : packSizeFor(resolved, undefined, fields.packSize ?? labelPackSize)
    : entry.packSizeLocked
      ? entry.packSize
      : (fields.packSize ?? entry.packSize);
  const numbered = entry.itemNumber === undefined && next.itemNumber;
  return {
    item: resolved ?? entry.item,
    batch: fields.batch ?? entry.batch,
    expiryDate: fields.expiryDate ?? entry.expiryDate,
    packSize,
    quantity: fields.quantity ?? entry.quantity,
    manufactureDate: fields.manufactureDate ?? entry.manufactureDate,
    itemLocked: resolved ? true : entry.itemLocked,
    packSizeLocked: resolved ? next.packSizeLocked : entry.packSizeLocked,
    itemNumber: entry.itemNumber ?? next.itemNumber,
    codeKnown: entry.codeKnown || next.codeKnown,
    learnCode:
      entry.item === undefined
        ? (next.learnCode ?? entry.learnCode)
        : entry.learnCode,
    content: numbered ? next.content : entry.content,
  };
};

/**
 * The line a draft adds to: same item, batch, pack size and expiry (.35,
 * .5). Made-on date is not part of the match. `lines` are the item's lines
 * on this shipment. An empty batch matches a line with none. A blank expiry
 * on either side matches any — the label said nothing, or the line has none
 * yet, and borrowDates / the save fill the blank.
 */
export const matchingLine = <L extends MatchableLine>(
  draft: Pick<CaptureDraft, 'item' | 'batch' | 'packSize' | 'expiryDate'>,
  lines: readonly L[]
): L | undefined => {
  if (!draft.item) return undefined;
  const batch = draft.batch.trim();
  return lines.find(
    line =>
      (line.batch ?? '') === batch &&
      line.packSize === draft.packSize &&
      (!draft.expiryDate ||
        !line.expiryDate ||
        line.expiryDate === draft.expiryDate)
  );
};

/**
 * Borrow a matched line's dates for the blanks the label left (rules: "the
 * matched line's own dates are borrowed to fill the blanks").
 */
export const borrowDates = (
  draft: CaptureDraft,
  match: MatchableLine | undefined
): CaptureDraft =>
  match
    ? {
        ...draft,
        expiryDate: draft.expiryDate ?? match.expiryDate ?? null,
        manufactureDate: draft.manufactureDate ?? match.manufactureDate ?? null,
      }
    : draft;

export type CaptureMessage =
  | { key: 'messages.receiving-no-product-code' }
  | { key: 'messages.receiving-new-barcode' }
  | { key: 'messages.receiving-item-not-in-store' }
  | { key: 'messages.batch-not-found' }
  | { key: 'messages.batch-already-exists'; numberOfPacks: number };

/**
 * The window's one message (ui-surface S2 § The message) — always
 * information, never an error or a warning (.110): not knowing a code is a
 * normal answer. Until an item is present it says whether the code can be
 * learned (.33, .70) — or, for a known code whose item this store cannot
 * see, that it will not be changed; once one is, whether saving adds to a
 * line or creates one (.35, .36).
 */
export const captureMessage = (
  draft: Pick<CaptureDraft, 'item' | 'itemNumber' | 'codeKnown'>,
  match: MatchableLine | undefined
): CaptureMessage => {
  if (!draft.item && draft.codeKnown)
    return { key: 'messages.receiving-item-not-in-store' };
  if (!draft.item)
    return draft.itemNumber
      ? { key: 'messages.receiving-new-barcode' }
      : { key: 'messages.receiving-no-product-code' };
  if (!match) return { key: 'messages.batch-not-found' };
  return {
    key: 'messages.batch-already-exists',
    numberOfPacks: match.numberOfPacks,
  };
};

/** Why the window cannot save what it holds, or undefined when it can. */
export type SaveRefusal =
  | 'error.barcode-scanner-save-no-item-selected'
  | 'error.barcode-scanner-save-no-quantity-entered';

/** .38, .39 — and .40, which is the same test gating OK. */
export const saveRefusal = (
  draft: Pick<CaptureDraft, 'item' | 'quantity'>
): SaveRefusal | undefined => {
  if (!draft.item) return 'error.barcode-scanner-save-no-item-selected';
  if (!(draft.quantity > 0))
    return 'error.barcode-scanner-save-no-quantity-entered';
  return undefined;
};

/**
 * The batch that saves the window (.35–.37): an update adding the quantity
 * to the matched line, else an insert of a new line. The fields on screen
 * are what is written.
 *
 * An update fills only the dates the line lacks (.103) — the line's own
 * expiry and made-on date are never overwritten, and a date the window left
 * blank is never sent as a clear.
 *
 * A new line's prices follow the inbound rule for any new manual line
 * (OMS-REG-REPL-09.10/.11): cost and sell price prefill from the item's
 * default sell price at its default pack size, and are zero at any other
 * pack size — or where the shipment's cost is locked by a source link.
 */
export const captureBatch = (
  draft: CaptureDraft,
  match: MatchableLine | undefined,
  context: { invoiceId: string; costLocked: boolean; newLineId: string }
): BatchInboundShipmentVariables['input'] | undefined => {
  const item = draft.item;
  if (!item || saveRefusal(draft)) return undefined;
  const batch = draft.batch.trim();
  if (match)
    return {
      updateInboundShipmentLines: [
        {
          id: match.id,
          numberOfPacks: match.numberOfPacks + draft.quantity,
          ...(!match.expiryDate && draft.expiryDate
            ? { expiryDate: { value: draft.expiryDate } }
            : {}),
          ...(!match.manufactureDate && draft.manufactureDate
            ? { manufactureDate: { value: draft.manufactureDate } }
            : {}),
        },
      ],
    };
  const price =
    !context.costLocked && draft.packSize === item.defaultPackSize
      ? item.defaultSellPricePerPack
      : 0;
  return {
    insertInboundShipmentLines: [
      {
        id: context.newLineId,
        invoiceId: context.invoiceId,
        itemId: item.id,
        packSize: draft.packSize,
        numberOfPacks: draft.quantity,
        batch: batch || undefined,
        expiryDate: draft.expiryDate ?? undefined,
        manufactureDate: draft.manufactureDate ?? undefined,
        costPricePerPack: price,
        sellPricePerPack: price,
      },
    ],
  };
};

/**
 * What a successful save teaches the book: the unknown item number against
 * the saved item, at the saved pack size. Undefined where there is nothing
 * to learn (a known code, a plain code, no code).
 */
export const codeToLearn = (
  draft: CaptureDraft
): { gtin: string; itemId: string; packSize: number } | undefined =>
  draft.learnCode && draft.item
    ? { gtin: draft.learnCode, itemId: draft.item.id, packSize: draft.packSize }
    : undefined;

/** The Barcode diagnostic line: the raw scan, cut to its first characters. */
export const shortContent = (content: string): string =>
  content.length > 10 ? `${content.slice(0, 10)}...` : content;
