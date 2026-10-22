// The Test scanner screen's plain test (spec/settings/ui-surface.md § S2 —
// test section; OMS-REG-SET-05.64–.66): what one scan means to whoever is
// holding the scanner. Everything is derived from the reading layer
// (src/domain/barcode) — the label is never re-parsed here — and the item is
// found exactly as receiving finds it: the barcode's mappings first, then the item by id.
// Read-only: nothing here learns a barcode.

import {
  labelFields,
  lookUpBarcode,
  scanCode,
  type BarcodeLookup,
  type ReadScan,
} from '@/domain/barcode';
import { lookUpItemById, type ItemLookup } from '@/domain/item';
import type { ScanSourceId } from '@/platform/barcodeScanner';

/** Which item a scan belongs to, as the test section words it. */
export type ItemMatch =
  | { kind: 'checking' }
  | { kind: 'item'; name: string; code: string }
  /** The barcode has no mapping yet — learned on first receipt. */
  | { kind: 'not-linked' }
  /** The label carries no item number (a batch-and-expiry-only barcode). */
  | { kind: 'no-code' }
  /** The barcode is mapped to an item this store cannot find. */
  | { kind: 'not-in-store' }
  /**
   * The barcode is mapped to several items and none is confirmed — scanning
   * it on a receiving or issuing screen asks which one.
   */
  | { kind: 'several'; count: number }
  /** A request failed; already reported globally. */
  | { kind: 'failed' };

/** One scan, as the test section shows it. */
export type ScanCheck = {
  /** The code that is looked up, where the scan has one. */
  code?: string;
  batch?: string;
  /** `YYYY-MM-DD`. */
  expiryDate?: string;
  quantity?: number;
  /** Which input produced it, where known. */
  source?: ScanSourceId;
  item: ItemMatch;
};

type Readable = Exclude<ReadScan, { kind: 'unreadable' }>;

/**
 * What the test section shows the moment a scan arrives, before the item
 * lookup has answered. `today` anchors the GS1 century window; tests only.
 */
export const scanCheckOf = (
  read: Readable,
  source: ScanSourceId | undefined,
  today?: Date
): ScanCheck => {
  const fields = labelFields(read, today);
  const code = scanCode(read);
  return {
    code,
    batch: fields.batch,
    expiryDate: fields.expiryDate,
    quantity: fields.quantity,
    source,
    item: code === undefined ? { kind: 'no-code' } : { kind: 'checking' },
  };
};

/** Fold the two lookups' answers into what the section says about the item. */
export const itemMatchOf = (
  lookup: BarcodeLookup,
  item?: ItemLookup
): ItemMatch => {
  switch (lookup.kind) {
    case 'no-code':
      return { kind: 'no-code' };
    case 'unknown':
      return { kind: 'not-linked' };
    case 'choose':
      return { kind: 'several', count: lookup.barcodes.length };
    case 'failed':
      return { kind: 'failed' };
    case 'known':
      if (item?.kind === 'found')
        return { kind: 'item', name: item.item.name, code: item.item.code };
      return item?.kind === 'missing'
        ? { kind: 'not-in-store' }
        : { kind: 'failed' };
  }
};

/** The lookups, injectable so the folding can be tested without a server. */
export type ScanCheckLookups = {
  lookUpBarcode: typeof lookUpBarcode;
  lookUpItemById: typeof lookUpItemById;
};

const liveLookups: ScanCheckLookups = { lookUpBarcode, lookUpItemById };

/**
 * Which item a scan belongs to: the same two calls the receiving screen
 * makes (inbound-shipments › createReceivingStrip), in the same order.
 */
export const findItem = async (
  storeId: string,
  read: Readable,
  lookups: ScanCheckLookups = liveLookups
): Promise<ItemMatch> => {
  const lookup = await lookups.lookUpBarcode(storeId, scanCode(read));
  if (lookup.kind !== 'known') return itemMatchOf(lookup);
  const item = await lookups.lookUpItemById(storeId, lookup.barcode.itemId);
  return itemMatchOf(lookup, item);
};
