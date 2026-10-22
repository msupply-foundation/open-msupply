// Receiving by scanning — the capture window's logic (spec/barcode-scanning
// rules.md § Receiving by scanning; ui-surface.md § S2; cases
// OMS-REG-BAC-01.31–.41, .102, .103, .108, .110).
//
// Pure: what a scan puts in the window, which line it matches, which message
// the window shows, and what a save writes. The save sends the scanned barcode
// with the new line; the server records it on the line and its stock and
// learns it for the item. The window (CaptureWindow.tsx) owns the requests and
// the timing.

import {
  isBatchLabel,
  itemNumber,
  labelFields,
  sameBarcode,
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
   * The mapping's pack size, where it has one. It pre-fills Pack size (.196)
   * but never locks it.
   */
  mappingPackSize: number | undefined;
  /**
   * The barcode saved with the line (.25, .185): a mapped barcode in its
   * standard form, or an unknown one where it is a real item number (rules:
   * "An unknown barcode is only worth learning when it is a real item
   * number"); other unknown content is used for the lookup only (.70).
   * Undefined otherwise. It also drives the message: a barcode that will be
   * remembered, or one that won't.
   */
  barcode: string | undefined;
  /** The raw scan, for the manual-input diagnostic readout. */
  content: string;
};

/** The line already on the shipment a draft would add to. */
export type MatchableLine = {
  id: string;
  batch?: string | null;
  barcode?: string | null;
  packSize: number;
  numberOfPacks: number;
  expiryDate?: string | null;
  manufactureDate?: string | null;
};

/**
 * A new line's pack size (.102, .196): the mapping's, else the label's, else the
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
 * The scan says what it is without a lookup: it carries an item number (a
 * label's, or a retail barcode), or it is a batch label. Either always
 * opens an entry, so only other scans need looking up before the window
 * decides.
 */
export const opensEntryUnseen = (read: CaptureRead): boolean =>
  itemNumber(read) !== undefined || isBatchLabel(read);

/**
 * A scan nothing is known about that is not a product code (rules: "Not
 * recognised"): the lookup found no mapping, or there was no code to look
 * up. It opens no entry — there is nothing to learn, so choosing an item for
 * it would mislead (.202, .195). A failed lookup is not this: it is reported
 * globally and opens as before.
 */
export const isUnrecognised = (
  read: CaptureRead,
  lookup: BarcodeLookup
): boolean =>
  !opensEntryUnseen(read) &&
  (lookup.kind === 'unknown' || lookup.kind === 'no-code');

/**
 * The window a scan opens (.31–.33). Item and pack size come from the mapping
 * where the code resolved — the item locked, the pack size only pre-filled;
 * batch, dates and quantity come from the label and stay editable (.20).
 *
 * Pack size follows packSizeFor: where the mapping and the label both carry one
 * the field shows the mapping's (.196).
 *
 * Every scan starts on an empty window (a scan-on saves and clears first),
 * so no item has been chosen before it: an unknown item number is always
 * learnable here (rules: "learned only if the user had not already chosen an
 * item before the scan").
 *
 * `item` is the mapping's item, resolved in this store — undefined where
 * the code is not known or its item cannot be seen here. A failed lookup
 * (already reported globally) opens like a scan with no code: item
 * unresolved and nothing to learn. The mapping's pack size is used only
 * where its item resolved; otherwise it would pre-fill a hand-picked item
 * with another item's pack size.
 */
export const draftFromScan = (
  read: CaptureRead,
  lookup: BarcodeLookup,
  item: CaptureItem | undefined
): CaptureDraft => {
  const fields = labelFields(read);
  // A barcode mapped to several items has been through the chooser before
  // this, so it arrives as the chosen mapping.
  const known = lookup.kind === 'known' ? lookup.barcode : undefined;
  const resolved = known ? item : undefined;
  const entryPackSize =
    resolved && known?.packSize != null && known.packSize > 0
      ? known.packSize
      : undefined;
  return {
    item: resolved,
    batch: fields.batch ?? '',
    expiryDate: fields.expiryDate ?? null,
    packSize: packSizeFor(resolved, entryPackSize, fields.packSize),
    quantity: fields.quantity ?? 0,
    manufactureDate: fields.manufactureDate ?? null,
    itemLocked: resolved !== undefined,
    mappingPackSize: entryPackSize,
    barcode: known
      ? known.barcode
      : lookup.kind === 'unknown'
        ? itemNumber(read)
        : undefined,
    content: read.content,
  };
};

/**
 * A batch label scanned onto the entry on screen (.186, .206): each value it
 * supplies replaces the entry's, and nothing else changes — not the item, not
 * the barcode the line will carry.
 */
export const fillFromLabel = (
  draft: CaptureDraft,
  label: CaptureRead
): CaptureDraft => {
  const fields = labelFields(label);
  return {
    ...draft,
    batch: fields.batch ?? draft.batch,
    expiryDate: fields.expiryDate ?? draft.expiryDate,
    manufactureDate: fields.manufactureDate ?? draft.manufactureDate,
    quantity: fields.quantity ?? draft.quantity,
    packSize: fields.packSize ?? draft.packSize,
  };
};

/**
 * A code scanned onto an entry a batch label opened, before any item was
 * chosen (.189): the new scan's draft, keeping the entry's values wherever
 * the new scan's label did not supply its own — including any the user typed
 * into the entry. Pack size follows
 * packSizeFor — the mapping's, else the new label's, else the entry's where
 * its label set one, else the item's default.
 */
export const mergeOntoLabelEntry = (
  entry: CaptureDraft,
  /** The pack size the entry's label stated, if it stated one. */
  entryPackSize: number | undefined,
  next: CaptureDraft,
  nextRead: CaptureRead
): CaptureDraft => {
  const fields = labelFields(nextRead);
  return {
    ...next,
    batch: fields.batch ?? entry.batch,
    expiryDate: fields.expiryDate ?? entry.expiryDate,
    manufactureDate: fields.manufactureDate ?? entry.manufactureDate,
    quantity: fields.quantity ?? entry.quantity,
    packSize:
      next.mappingPackSize !== undefined || fields.packSize !== undefined
        ? next.packSize
        : packSizeFor(next.item, undefined, entryPackSize),
  };
};

/**
 * Pick an item by hand (unknown code, or no code). Pack size follows
 * packSizeFor — the label's, else the item's default. Only an unresolved
 * entry is picked by hand, so there is no mapping pack size to keep.
 */
export const chooseItem = (
  draft: CaptureDraft,
  item: CaptureItem | undefined,
  labelPackSize: number | undefined
): CaptureDraft => ({
  ...draft,
  item,
  packSize: packSizeFor(item, undefined, labelPackSize),
});

/**
 * The line a draft adds to: same item, batch and pack size (.176, .175). The
 * barcode keeps two lines apart only when both have one and they differ — two
 * manufacturers' boxes of the same batch — so a line typed in by hand and a
 * scanned box merge. Dates are not part of the match: borrowDates and the
 * save fill a blank from the other side. `lines` are the item's lines on this
 * shipment. An empty batch matches a line with none.
 */
export const matchingLine = <L extends MatchableLine>(
  draft: Pick<CaptureDraft, 'item' | 'batch' | 'packSize' | 'barcode'>,
  lines: readonly L[]
): L | undefined => {
  if (!draft.item) return undefined;
  const batch = draft.batch.trim();
  return lines.find(
    line =>
      (line.batch ?? '') === batch &&
      line.packSize === draft.packSize &&
      (!draft.barcode ||
        !line.barcode ||
        sameBarcode(line.barcode, draft.barcode))
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
  | { key: 'messages.batch-not-found' }
  | { key: 'messages.batch-already-exists'; numberOfPacks: number };

/**
 * The window's one message (ui-surface S2 § The message) — always
 * information, never an error or a warning (.110): not knowing a code is a
 * normal answer. Until an item is present it says whether the barcode will
 * be remembered for the item the user picks (.33, .205) — it will where the
 * line carries one; once an item is present, whether saving adds to a line
 * or creates one (.176, .36).
 */
export const captureMessage = (
  draft: Pick<CaptureDraft, 'item' | 'barcode'>,
  match: MatchableLine | undefined
): CaptureMessage => {
  if (!draft.item)
    return draft.barcode
      ? { key: 'messages.receiving-new-barcode' }
      : { key: 'messages.receiving-no-product-code' };
  if (!match) return { key: 'messages.batch-not-found' };
  return {
    key: 'messages.batch-already-exists',
    numberOfPacks: match.numberOfPacks,
  };
};

/** Why the window cannot save what it holds, or undefined when it can. */
export type SaveRefusal = 'error.barcode-scanner-save-no-item-selected';

/**
 * .38 — and .199, which is the same test gating OK. A quantity of zero saves:
 * the line is a placeholder the user fills in later (.198).
 */
export const saveRefusal = (
  draft: Pick<CaptureDraft, 'item'>
): SaveRefusal | undefined =>
  draft.item ? undefined : 'error.barcode-scanner-save-no-item-selected';

/**
 * The batch that saves the window (.36, .37, .176): an update adding the quantity
 * to the matched line, else an insert of a new line. The fields on screen
 * are what is written.
 *
 * An update fills only what the line lacks (.103, .196) — its expiry,
 * made-on date and barcode are never overwritten, and a date the window left
 * blank is never sent as a clear. An update with nothing to add is not sent:
 * undefined, and the window moves on as if it had saved.
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
  if (match) {
    const fill = {
      ...(!match.expiryDate && draft.expiryDate
        ? { expiryDate: { value: draft.expiryDate } }
        : {}),
      ...(!match.manufactureDate && draft.manufactureDate
        ? { manufactureDate: { value: draft.manufactureDate } }
        : {}),
      ...(!match.barcode && draft.barcode ? { barcode: draft.barcode } : {}),
    };
    if (draft.quantity === 0 && Object.keys(fill).length === 0)
      return undefined;
    return {
      updateInboundShipmentLines: [
        {
          id: match.id,
          numberOfPacks: match.numberOfPacks + draft.quantity,
          ...fill,
        },
      ],
    };
  }
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
        ...(draft.barcode ? { barcode: draft.barcode } : {}),
      },
    ],
  };
};

/** The Barcode diagnostic line: the raw scan, cut to its first characters. */
export const shortContent = (content: string): string =>
  content.length > 10 ? `${content.slice(0, 10)}...` : content;
