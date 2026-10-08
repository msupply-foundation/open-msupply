// Reading a scan (spec/barcode-scanning/rules.md § Reading a scan).
//
// The hardware layer hands up a RawScan; this turns it into what the rest of
// the app works with. Two answers only: a structured label, carrying its
// elements; or raw content, which is a perfectly normal thing to scan and
// never an error. Neither is reported to the user.
//
// Everything a screen wants from a scan is derived from that — the code to
// look up (`scanCode`), the values to pre-fill (`labelFields`) — rather than
// flattened into it up front. Cold chain needs every element, not the six a
// stock screen reads, and forwards them to the server as they are.

import type { RawScan } from '@/platform/barcodeSources/source';
import {
  gs1Date,
  GS,
  isGs1AimId,
  isRetailGtin,
  parseGs1,
  type Gs1Element,
} from './gs1';
import { scanCharacters } from './scanText';

export type ReadScan =
  /** Not a structured label. `content` is the whole of it. */
  | { kind: 'raw'; content: string }
  /**
   * A GS1 label. `content` is the tidied characters as scanned; `elements`
   * every AI and value in label order, verbatim.
   */
  | { kind: 'gs1'; content: string; elements: Gs1Element[] }
  /**
   * Not a code at all — a HID report in no framing this app knows, whose
   * bytes cannot be told apart from its label. `content` is the best-effort
   * characters, for diagnostics only; it has no code and no item number.
   * A screen treats it as a failed read.
   */
  | { kind: 'unreadable'; content: string };

/** Zero-width marks some decoders insert: never part of any code. */
const isZeroWidth = (code: number): boolean =>
  (code >= 0x200b && code <= 0x200d) || // zero-width space / (non-)joiner
  code === 0x2060 || // word joiner
  code === 0xfeff; // byte-order mark

/**
 * A control character or whitespace — noise when it pads a code: a
 * scanner's terminator, a framing byte, a trailing newline. The field
 * separator is not noise; trimSeparators below handles it.
 */
const isEdgeNoise = (char: string): boolean => {
  const code = char.codePointAt(0) ?? 0;
  if (code === 0x1d) return false;
  return code <= 0x20 || code === 0x7f || /\s/.test(char);
};

/**
 * Strip zero-width marks everywhere, and control characters and whitespace
 * at the two ends only. Inside a code a control character may be data: ISO
 * 15434 envelopes (`[)>␞06␝…␞␄`) separate their parts with RS and end with
 * EOT, and deleting those would turn one code into a different one.
 */
const tidy = (text: string): string => {
  const chars = [...text].filter(c => !isZeroWidth(c.codePointAt(0) ?? 0));
  let start = 0;
  let end = chars.length;
  while (start < end && isEdgeNoise(chars[start] ?? '')) start += 1;
  while (end > start && isEdgeNoise(chars[end - 1] ?? '')) end -= 1;
  return chars.slice(start, end).join('');
};

/** Drop leading and trailing field separators. */
const trimSeparators = (text: string): string => {
  let start = 0;
  let end = text.length;
  while (start < end && text[start] === GS) start += 1;
  while (end > start && text[end - 1] === GS) end -= 1;
  return text.slice(start, end);
};

/** An AIM symbology identifier transmitted at the front of the text. */
const AIM_PREFIX = /^\][A-Za-z][0-9A-Za-z]/;

/**
 * Read a scan's characters.
 *
 * Tidy first (rules § Reading a scan — "Tidy up first"): strip zero-width
 * marks, trim control characters and whitespace from the ends, and drop the
 * separators at either end — a camera decoder
 * reports the FNC1 that opens every GS1 symbol, a laser scanner does not,
 * and the same label must read the same from both. An AIM identifier sent in
 * the text is lifted out too; it describes the symbol, and is not part of
 * the code.
 */
export const readText = (text: string, aimId?: string): ReadScan => {
  let content = tidy(text);
  let symbology = aimId;
  const prefixed = AIM_PREFIX.exec(content);
  if (prefixed) {
    symbology ??= prefixed[0];
    content = content.slice(prefixed[0].length);
  }
  const openedWithSeparator = content.startsWith(GS);
  content = trimSeparators(content);

  const elements = parseGs1(content, isGs1AimId(symbology) || openedWithSeparator);
  return elements ? { kind: 'gs1', content, elements } : { kind: 'raw', content };
};

/** Read a scan as the hardware layer delivered it. */
export const readScan = (scan: RawScan): ReadScan => {
  const { text, aimId, unrecognised } = scanCharacters(scan);
  if (unrecognised) return { kind: 'unreadable', content: text };
  return readText(text, aimId);
};

/** One element's value, where the label carried it (first occurrence). */
export const gs1Value = (scan: ReadScan, ai: string): string | undefined =>
  scan.kind === 'gs1' ? scan.elements.find(e => e.ai === ai)?.data : undefined;

/**
 * The scan's item number, where it carried one: a structured label's AI 01,
 * or the whole of a retail barcode — a GTIN printed without markers
 * (rules § Reading a scan, OMS-REG-BAC-01.65). What makes an unknown code
 * worth learning: anything else plain is as likely to be a shipment number
 * or a date as a product.
 */
export const itemNumber = (scan: ReadScan): string | undefined => {
  if (scan.kind === 'gs1') return gs1Value(scan, '01');
  if (scan.kind === 'raw' && isRetailGtin(scan.content)) return scan.content;
  return undefined;
};

/**
 * The code a scan is looked up — and learned — by, or `undefined` where it
 * has none (rules § Reading a scan, "Which part of the scan is the code"):
 *
 * - a structured label: its item number. One WITHOUT an item number — the
 *   batch-and-expiry half of a two-barcode box — has no code (.67). Looking
 *   it up by its whole text can never match, and learning that text would
 *   attach it to an item permanently.
 * - raw content: itself, exactly as scanned — including a retail GTIN,
 *   which is never re-padded to 14 digits, so codes learned by the current
 *   app keep matching.
 * - an empty scan: none (.68) — the server would otherwise match, and even
 *   store, the empty string (contract § Looking a code up).
 */
export const scanCode = (scan: ReadScan): string | undefined => {
  if (scan.kind === 'gs1') return gs1Value(scan, '01');
  if (scan.kind === 'unreadable') return undefined;
  return scan.content === '' ? undefined : scan.content;
};

/** What a stock screen pre-fills from a label. Every part optional. */
export type LabelFields = {
  itemNumber?: string;
  batch?: string;
  /** `YYYY-MM-DD`. */
  expiryDate?: string;
  /** `YYYY-MM-DD`. */
  manufactureDate?: string;
  quantity?: number;
  packSize?: number;
};

const count = (value: string | undefined): number | undefined => {
  if (value === undefined || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return n > 0 ? n : undefined;
};

const date = (value: string | undefined, today: Date): string | undefined =>
  value === undefined ? undefined : gs1Date(value, today);

/**
 * The six values stock screens read: item number, `10` batch, `17` expiry,
 * `11` made-on, `30` quantity, `37` pack size. For raw content, at most the
 * item number (a retail barcode). `today` anchors the GS1 century window;
 * pass it only in tests.
 */
export const labelFields = (scan: ReadScan, today: Date = new Date()): LabelFields => {
  const fields: LabelFields = {};
  const set = <K extends keyof LabelFields>(key: K, value: LabelFields[K]) => {
    if (value !== undefined) fields[key] = value;
  };
  set('itemNumber', itemNumber(scan));
  if (scan.kind !== 'gs1') return fields;
  set('batch', gs1Value(scan, '10'));
  set('expiryDate', date(gs1Value(scan, '17'), today));
  set('manufactureDate', date(gs1Value(scan, '11'), today));
  set('quantity', count(gs1Value(scan, '30')));
  set('packSize', count(gs1Value(scan, '37')));
  return fields;
};
