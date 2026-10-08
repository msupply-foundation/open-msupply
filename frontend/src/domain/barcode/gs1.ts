// GS1 element strings → their elements.
//
// A structured label packs several values into one code, each introduced by
// an application identifier (AI): `01` item number, `10` batch, `17` expiry
// and so on (spec/barcode-scanning/README.md § Glossary). Fixed-length values
// run straight into the next AI; a variable-length one is ended by the field
// separator (GS, 0x1D) or by the end of the code.
//
// Hand-rolled rather than bought. Splitting an element string needs only two
// facts from the GS1 General Specifications — how many digits an AI has, and
// which AIs are fixed-length — and both are short tables keyed on the first
// two digits (§ 7.8.5). The reference app's library carries the whole AI
// dictionary to answer the same question, and still cannot tell a GS1 label
// from a plain retail code (see `parseGs1` below).

/**
 * One AI and its value, verbatim — the same shape as the server's
 * `Gs1DataElement`, so cold chain can forward elements unchanged.
 */
export type Gs1Element = { ai: string; data: string };

export const GS = String.fromCharCode(29);

/**
 * How many digits the AI starting at these two digits has, per the GS1 AI
 * prefix table. `undefined` for a prefix no AI starts with — which ends the
 * parse, because nothing after an unknown AI can be split.
 */
const aiLength = (prefix: number): 2 | 3 | 4 | undefined => {
  if (prefix <= 2) return 2; // 00 SSCC, 01 GTIN, 02 content GTIN
  if (prefix >= 10 && prefix <= 22) return 2; // batch, dates, variant, serial…
  if (prefix >= 23 && prefix <= 25) return 3; // 235, 240–243, 250–255
  if (prefix === 30 || prefix === 37) return 2; // count, pack count
  if (prefix >= 31 && prefix <= 36) return 4; // measures, 3100–3699
  if (prefix === 39) return 4; // amounts, 3900–3955
  if (prefix >= 40 && prefix <= 42) return 3; // references, GLNs, postal
  if (prefix === 43) return 4; // 4300–4333 logistics
  if (prefix === 70 || prefix === 72) return 4; // 7001–7040, 7230–7241
  if (prefix === 71) return 3; // 710–717 national healthcare codes
  if (prefix >= 80 && prefix <= 82) return 4; // 8001–8200
  if (prefix >= 90) return 2; // 90 mutually agreed, 91–99 company internal
  return undefined;
};

/**
 * AIs whose value has a predefined length and so is NOT followed by a
 * separator, keyed on the first two digits: the value's length (§ 7.8.5,
 * figure 7.8.5-2). Every other AI is variable-length.
 */
const FIXED_DATA_LENGTH: Record<number, number> = {
  0: 18, 1: 14, 2: 14,
  11: 6, 12: 6, 13: 6, 15: 6, 16: 6, 17: 6,
  20: 2,
  31: 6, 32: 6, 33: 6, 34: 6, 35: 6, 36: 6,
  41: 13,
};

/** AIs whose value is a YYMMDD date. */
export const DATE_AIS = new Set(['11', '12', '13', '15', '16', '17']);

/** Variable-length AIs whose value must be all digits. */
const NUMERIC_VARIABLE_AIS = new Set(['30', '37']);

const DIGITS = /^\d+$/;

/**
 * Whether a YYMMDD is a date at all. Year-agnostic (29 February is allowed):
 * which century it lands in is `gs1Date`'s question, not validity's. Day 00
 * is valid — GS1 uses it for "end of the month".
 */
const isYymmdd = (value: string): boolean => {
  if (!/^\d{6}$/.test(value)) return false;
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  const monthLength = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return monthLength !== undefined && day <= monthLength;
};

/**
 * Whether a value is plausible for its AI — digits where the AI is numeric,
 * a real date where it is a date. Applied ONLY to a label that opens with an
 * expiry date and has nothing else saying it is GS1, to tell it from an
 * opaque code that happens to split. Once the symbol itself has said GS1, values are not judged:
 * "The reader does not judge the values it finds" (spec/barcode-scanning/
 * rules.md § Reading a scan) — a 31 February stays a 31 February, the
 * date simply reads as no date, and the GTIN beside it is not lost.
 */
const valueFits = (ai: string, data: string): boolean => {
  if (data === '') return false;
  const prefix = Number(ai.slice(0, 2));
  if (FIXED_DATA_LENGTH[prefix] !== undefined && !DIGITS.test(data)) return false;
  if (DATE_AIS.has(ai) && !isYymmdd(data)) return false;
  if (NUMERIC_VARIABLE_AIS.has(ai) && !DIGITS.test(data)) return false;
  return true;
};

/**
 * Split an element string as the scanner transmits it: AIs and values run
 * together, variable-length values ended by GS. `undefined` where it does not
 * split cleanly all the way to the end.
 */
const splitElementString = (
  text: string,
  judgeValues: boolean
): Gs1Element[] | undefined => {
  const elements: Gs1Element[] = [];
  let i = 0;
  while (i < text.length) {
    // A separator after a fixed-length value is redundant but legal, and
    // printers emit it.
    if (text[i] === GS) {
      i += 1;
      continue;
    }
    const prefixText = text.slice(i, i + 2);
    if (!/^\d\d$/.test(prefixText)) return undefined;
    const prefix = Number(prefixText);
    const length = aiLength(prefix);
    if (length === undefined) return undefined;
    const ai = text.slice(i, i + length);
    if (ai.length !== length || !DIGITS.test(ai)) return undefined;
    i += length;

    const fixed = FIXED_DATA_LENGTH[prefix];
    let data: string;
    if (fixed !== undefined) {
      data = text.slice(i, i + fixed);
      if (data.length !== fixed) return undefined;
      i += fixed;
    } else {
      const end = text.indexOf(GS, i);
      data = text.slice(i, end === -1 ? undefined : end);
      i = end === -1 ? text.length : end;
    }
    if (judgeValues ? !valueFits(ai, data) : data === '') return undefined;
    elements.push({ ai, data });
  }
  return elements.length > 0 ? elements : undefined;
};

/**
 * Split the human-readable form printed under a label — `(01)0950…(10)AB-12`
 * — which is what a person types from the box. The server's asset lookup
 * accepts this form too (server/util/src/gs1.rs).
 */
const splitBracketed = (text: string): Gs1Element[] | undefined => {
  const elements: Gs1Element[] = [];
  const pattern = /\((\d{2,4})\)([^(]*)/y;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const [, ai = '', data = ''] = match;
    if (aiLength(Number(ai.slice(0, 2))) !== ai.length) return undefined;
    const fixed = FIXED_DATA_LENGTH[Number(ai.slice(0, 2))];
    if (fixed !== undefined && data.length !== fixed) return undefined;
    // The bracketed form is itself evidence of GS1, so values are not
    // judged here either — only that there is one.
    if (data === '') return undefined;
    elements.push({ ai, data });
    if (pattern.lastIndex === text.length) return elements;
  }
  return undefined;
};

/**
 * AIM symbology identifiers that say the symbol is GS1-structured: GS1-128,
 * GS1 DataBar, GS1 DataMatrix, GS1 QR, GS1 DotCode. Reported by the decoder
 * (RawScan `aimId`), or occasionally transmitted at the front of the text.
 */
const GS1_AIM_IDS = new Set(['C1', 'e0', 'e1', 'e2', 'd2', 'Q3', 'J1']);

export const isGs1AimId = (aimId: string | undefined): boolean =>
  aimId !== undefined && GS1_AIM_IDS.has(aimId.replace(/^\]/, ''));

/**
 * The AIs a label may open with when nothing else says it is GS1. The
 * primary keys (00 SSCC, 01 GTIN, 02 content GTIN) open every real
 * identifying label; 17 opens the batch-and-expiry half of a box printed
 * with two barcodes, which carries no key at all and — read by a scanner
 * that does not transmit FNC1 — has nothing else to go on. See `parseGs1`.
 */
const OPENING_AIS = new Set(['00', '01', '02', '17']);

/**
 * Whether `digits` is a retail GTIN: 8, 12, 13 or 14 digits (EAN-8, UPC-A,
 * EAN-13, ITF-14) ending in a valid GS1 check digit. The check digit is the
 * standard mod-10 over the other digits, weighted 3,1,3,… from the right.
 *
 * A check digit is a guard against a random string passing, not against a
 * misread: a camera decoder has been seen to return a two-digit misread of
 * an EAN-13 whose check digit still validated (captures.test.ts).
 */
export const isRetailGtin = (digits: string): boolean => {
  if (!/^(\d{8}|\d{12,14})$/.test(digits)) return false;
  const body = digits.slice(0, -1);
  let sum = 0;
  for (let i = 0; i < body.length; i += 1) {
    const digit = Number(body[body.length - 1 - i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
};

/**
 * Read `text` as a GS1 element string, if it is one.
 *
 * The hard part is not splitting but DECIDING. Every all-digit code splits
 * as something — a retail EAN-13 `1012345678901` reads as "batch
 * 12345678901", and the reference app's library says exactly that, so
 * scanning a plain box pre-fills a nonsense batch. So what counts as
 * structured depends on the evidence (spec/barcode-scanning/rules.md
 * § Reading a scan, OMS-REG-BAC-01.64):
 *
 * - `evidence` — the decoder said GS1 (AIM identifier), the text opened with
 *   a separator (FNC1, which only GS1 symbols carry), it contains one, or it
 *   is in bracketed form. Then any element string that splits cleanly is
 *   GS1.
 * - no evidence — a wedge or a plain reader that transmits no FNC1. Then it
 *   must also open with one of OPENING_AIS. A retail code cannot open with a
 *   key and still split — an EAN-13 beginning "01" is too short to hold a
 *   14-digit GTIN — but it CAN open like an expiry date, so a string that is
 *   a valid retail GTIN is read as one instead (.66): mistaking a retail
 *   code for a label pre-fills a nonsense batch, while the reverse only
 *   leaves a label unread.
 */
export const parseGs1 = (
  text: string,
  evidence: boolean
): Gs1Element[] | undefined => {
  if (text.startsWith('(')) return splitBracketed(text);
  if (evidence || text.includes(GS)) return splitElementString(text, false);
  const elements = splitElementString(text, false);
  if (!elements) return undefined;
  if (isRetailGtin(text)) return undefined;
  const [first] = elements;
  if (!first || !OPENING_AIS.has(first.ai)) return undefined;
  // An opening expiry date is all there is to go on, so every value must be
  // plausible for its AI. An opening key is itself the evidence — only the
  // key must be digits (a key of letters is no key), and the values after it
  // are not judged, so the GTIN beside a 31 February is kept (.71).
  if (first.ai === '17')
    return elements.every(({ ai, data }) => valueFits(ai, data))
      ? elements
      : undefined;
  return DIGITS.test(first.data) ? elements : undefined;
};

/**
 * A GS1 YYMMDD as `YYYY-MM-DD`, the NaiveDate the API speaks.
 *
 * The century follows the GS1 sliding window (General Specifications
 * § 7.12): a year more than 50 ahead of `today` is last century, more than
 * 49 behind is next century. Day 00 means the last day of the month.
 *
 * A string, never a `Date`: the reference app's library returns a local
 * midnight `Date`, which is a different calendar day in UTC for every site
 * east of Greenwich — an expiry of 31 Dec serialises as 30 Dec.
 */
export const gs1Date = (yymmdd: string, today: Date): string | undefined => {
  if (!isYymmdd(yymmdd)) return undefined;
  const yy = Number(yymmdd.slice(0, 2));
  const month = Number(yymmdd.slice(2, 4));
  let day = Number(yymmdd.slice(4, 6));

  const thisYear = today.getFullYear();
  const century = Math.floor(thisYear / 100) * 100;
  const difference = yy - (thisYear % 100);
  const year =
    difference > 50 ? century - 100 + yy : difference < -49 ? century + 100 + yy : century + yy;

  // Day 0 of the following month is the last day of this one.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day === 0) day = lastDay;
  // 29 February in a year that has none.
  if (day > lastDay) return undefined;

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
};
