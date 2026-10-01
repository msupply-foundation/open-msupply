import { describe, expect, it } from 'vitest';
import { GS, gs1Date, isGs1AimId, isRetailGtin, parseGs1 } from './gs1';

// Test names lead with the OMS-REG-BAC-01 behaviours they cover
// (spec/barcode-scanning/cases).

describe('splitting an element string', () => {
  it('.14 splits fixed- and variable-length elements', () => {
    // The reference app's own fixture.
    expect(parseGs1('01095011015300031714070410AB-123', false)).toEqual([
      { ai: '01', data: '09501101530003' },
      { ai: '17', data: '140704' },
      { ai: '10', data: 'AB-123' },
    ]);
  });

  it('ends a variable-length value at the field separator', () => {
    expect(parseGs1(`0109506682101352172910031010test${GS}21532`, false)).toEqual([
      { ai: '01', data: '09506682101352' },
      { ai: '17', data: '291003' },
      { ai: '10', data: '10test' },
      { ai: '21', data: '532' },
    ]);
  });

  // "A printer that omits a field separator runs two values into one — the
  // reader reports the merged value, because that is genuinely what the
  // label says" (rules § Reading a scan).
  it('.18 reports a value merged by a missing separator as one value', () => {
    expect(parseGs1('0109506682101352' + '10test21532', false)).toEqual([
      { ai: '01', data: '09506682101352' },
      { ai: '10', data: 'test21532' },
    ]);
  });

  it('tolerates a redundant separator after a fixed-length value', () => {
    expect(parseGs1(`0109501101530003${GS}10AB`, false)).toEqual([
      { ai: '01', data: '09501101530003' },
      { ai: '10', data: 'AB' },
    ]);
  });

  it('reads three- and four-digit AIs', () => {
    // A WHO PQS equipment label: part number (241), warranty (91).
    expect(parseGs1(`0109501101530003${GS}241E003/123${GS}21SN-1`, true)).toEqual([
      { ai: '01', data: '09501101530003' },
      { ai: '241', data: 'E003/123' },
      { ai: '21', data: 'SN-1' },
    ]);
    expect(parseGs1('01095011015300033103000500', false)).toEqual([
      { ai: '01', data: '09501101530003' },
      { ai: '3103', data: '000500' },
    ]);
  });

  it('reads the bracketed human-readable form', () => {
    expect(parseGs1('(01)09501101530003(17)261231(10)AB 12', false)).toEqual([
      { ai: '01', data: '09501101530003' },
      { ai: '17', data: '261231' },
      { ai: '10', data: 'AB 12' },
    ]);
  });

  it('fails a label that does not split cleanly to the end', () => {
    expect(parseGs1('010950110153', true)).toBeUndefined(); // GTIN cut short
    expect(parseGs1('0109501101530003' + '38123', true)).toBeUndefined(); // no AI 38
    expect(parseGs1('01095011015300031710', true)).toBeUndefined(); // date too short
    expect(parseGs1('(01)0950110153(10)AB', true)).toBeUndefined();
    expect(parseGs1('not-a-valid-gs1-barcode', true)).toBeUndefined();
  });

  // Once the symbol has said GS1, a bad value is the label's problem, not a
  // reason to lose the rest of it — the GTIN beside a 31 February is still
  // the GTIN.
  it('.71 keeps a GS1 label whole when one value is implausible', () => {
    expect(parseGs1('0109501101530003' + '17250231', true)).toEqual([
      { ai: '01', data: '09501101530003' },
      { ai: '17', data: '250231' },
    ]);
    expect(parseGs1('(01)09501101530003(17)261399', false)).toEqual([
      { ai: '01', data: '09501101530003' },
      { ai: '17', data: '261399' },
    ]);
  });

  // A label opening with an expiry date and nothing else saying GS1: then
  // plausibility is all that tells it from a code that happens to split.
  it('judges values when a label opens with an expiry date and nothing says GS1', () => {
    expect(parseGs1('1726139910AB', false)).toBeUndefined();
    expect(parseGs1('17261231' + '30AB', false)).toBeUndefined(); // count of letters
  });

  // An opening key is evidence enough: a wedge read keeps its GTIN beside
  // an impossible date (rules § Reading a scan, .71).
  it('.71 does not judge the values after an opening key', () => {
    expect(parseGs1('0109501101530003' + '17261399', false)).toEqual([
      { ai: '01', data: '09501101530003' },
      { ai: '17', data: '261399' },
    ]);
  });

  it('does not read an opening key of letters as a key', () => {
    expect(parseGs1('01ABCDEFGHIJKLMN', false)).toBeUndefined();
  });
});

// The reference app's library reads 1012345678901 — an ordinary EAN-13 — as
// "batch 12345678901", so a plain box pre-fills a nonsense batch. Probed
// against gs1-barcode-parser-mod 1.0.7.
describe('telling a structured label from a retail code', () => {
  it('leaves retail codes alone when nothing says GS1', () => {
    expect(parseGs1('1012345678901', false)).toBeUndefined(); // EAN-13
    expect(parseGs1('9300601234567', false)).toBeUndefined(); // EAN-13
    expect(parseGs1('012345678905', false)).toBeUndefined(); // UPC-A
    expect(parseGs1('0123456789012', false)).toBeUndefined(); // EAN-13, "01…"
    expect(parseGs1('21123456', false)).toBeUndefined(); // warehouse sticker
  });

  // The batch-and-expiry half of a two-barcode box, from a scanner that
  // sends no FNC1 and with no separator inside it: it opens like an expiry
  // date, which is all there is to go on (OMS-REG-BAC-01.64).
  it('reads a label opening with an expiry date', () => {
    expect(parseGs1('1726013110U013383', false)).toEqual([
      { ai: '17', data: '260131' },
      { ai: '10', data: 'U013383' },
    ]);
  });

  // …unless those same digits are a valid retail barcode, which wins
  // (OMS-REG-BAC-01.66): a retail code misread as a label pre-fills a
  // nonsense batch, where the reverse only leaves a label unread.
  it('reads a valid retail barcode as retail even if it opens like a date', () => {
    const ean = '1726013110121'; // 17 260131 10 121 — and a valid EAN-13
    expect(isRetailGtin(ean)).toBe(true);
    expect(parseGs1(ean, false)).toBeUndefined();
    expect(parseGs1(ean, true)).toEqual([
      { ai: '17', data: '260131' },
      { ai: '10', data: '121' },
    ]);
  });

  it('accepts any element string when the symbol says GS1', () => {
    expect(parseGs1('21123456', true)).toEqual([{ ai: '21', data: '123456' }]);
  });

  it('treats a separator inside the code as saying GS1', () => {
    expect(parseGs1(`10AB${GS}21123`, false)).toEqual([
      { ai: '10', data: 'AB' },
      { ai: '21', data: '123' },
    ]);
  });

  it('recognises the GS1 AIM identifiers, with or without the bracket', () => {
    expect(isGs1AimId(']C1')).toBe(true);
    expect(isGs1AimId('d2')).toBe(true);
    expect(isGs1AimId(']Q3')).toBe(true);
    expect(isGs1AimId(']C0')).toBe(false);
    expect(isGs1AimId(']E0')).toBe(false);
    expect(isGs1AimId(undefined)).toBe(false);
  });
});

describe('reading a GS1 date', () => {
  const today = new Date(2026, 8, 23);

  it('.15 reads YYMMDD as a calendar date', () => {
    expect(gs1Date('261231', today)).toBe('2026-12-31');
  });

  it('.15 reads day 00 as the last day of the month', () => {
    expect(gs1Date('260200', today)).toBe('2026-02-28');
    expect(gs1Date('280200', today)).toBe('2028-02-29');
    expect(gs1Date('261100', today)).toBe('2026-11-30');
  });

  it('applies the GS1 century window', () => {
    expect(gs1Date('760101', today)).toBe('2076-01-01'); // 50 ahead: this century
    expect(gs1Date('770101', today)).toBe('1977-01-01'); // 51 ahead: last century
    expect(gs1Date('990101', today)).toBe('1999-01-01');
    expect(gs1Date('000101', new Date(2080, 0, 1))).toBe('2100-01-01'); // 80 behind: next
  });

  it('rejects dates that do not exist', () => {
    expect(gs1Date('270229', today)).toBeUndefined();
    expect(gs1Date('261301', today)).toBeUndefined();
    expect(gs1Date('2612', today)).toBeUndefined();
  });
});

describe('recognising a retail barcode', () => {
  it('accepts EAN-8, UPC-A, EAN-13 and ITF-14 with a valid check digit', () => {
    expect(isRetailGtin('96385074')).toBe(true);
    expect(isRetailGtin('036000291452')).toBe(true);
    expect(isRetailGtin('9300657270520')).toBe(true);
    expect(isRetailGtin('10012345678902')).toBe(true);
  });

  it('rejects a wrong check digit, other lengths and non-digits', () => {
    expect(isRetailGtin('9300657270521')).toBe(false);
    expect(isRetailGtin('123456789')).toBe(false);
    expect(isRetailGtin('930065727052X')).toBe(false);
    expect(isRetailGtin('')).toBe(false);
  });

  // Captured 2026-09-23: a camera misread of 9300657270520. Two digits wrong,
  // check digit still valid — the check digit is no defence against this.
  it('cannot tell a check-digit-preserving misread from the real code', () => {
    expect(isRetailGtin('9300817270520')).toBe(true);
  });
});
