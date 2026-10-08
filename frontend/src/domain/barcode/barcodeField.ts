// What a scan does to a stock line's Barcode field (spec/barcode-scanning/
// rules.md § Setting a code on a stock line; stock/ui-surface S2). Used by
// the stock line detail and by New stock, which carry the same field.

import { labelFields, scanCode, type ReadScan } from './readScan';

/** The part of a stock line form a scan into its Barcode field writes. */
export type BarcodeFieldFill = {
  barcode?: string;
  batch?: string;
  /** `YYYY-MM-DD`. */
  expiryDate?: string;
};

/**
 * The code, the batch and the expiry date — each where the scan supplied
 * it, replacing what the form held (OMS-REG-BAC-01.49). The made-on date is
 * never touched, even where the label carried one (.50).
 *
 * A value the scan did NOT supply is left out rather than cleared: a raw
 * code carries no batch, and scanning it should not wipe a batch the user
 * typed. A structured label without an item number has no code (.67), so it
 * leaves the Barcode field alone and fills only batch and expiry.
 */
export const barcodeFieldFill = (
  scan: ReadScan,
  today?: Date
): BarcodeFieldFill => {
  const fill: BarcodeFieldFill = {};
  const code = scanCode(scan);
  if (code !== undefined) fill.barcode = code;
  const { batch, expiryDate } = labelFields(scan, today);
  if (batch !== undefined) fill.batch = batch;
  if (expiryDate !== undefined) fill.expiryDate = expiryDate;
  return fill;
};
