import { describe, expect, it } from 'vitest';
import { itemNumber, labelFields, readScan, readText, scanCode } from './readScan';

// Test names lead with the OMS-REG-BAC-01 behaviours they cover
// (spec/barcode-scanning/cases).

const GS = String.fromCharCode(29);
const today = new Date(2026, 8, 23);

describe('tidying a scan', () => {
  it('.19 strips zero-width characters and trims', () => {
    expect(readText('​  ABC-123 ﻿')).toEqual({ kind: 'raw', content: 'ABC-123' });
  });

  it('.19 .73 trims control characters from the ends, but never the field separator', () => {
    expect(readText('\u0016ABC\r\n')).toEqual({ kind: 'raw', content: 'ABC' });
    const read = readText(`${GS}0109501101530003${GS}10AB${GS}`);
    expect(read.content).toBe(`0109501101530003${GS}10AB`);
  });

  // Inside a code a control character can be data: an ISO 15434 envelope
  // separates its parts with RS. Its trailing RS+EOT sit at the edge and are
  // trimmed like any other — the same way on every read, so still one code.
  it('.73 keeps control characters inside a code', () => {
    const envelope = `[)>\u001e06${GS}1PABC${GS}SQ7`;
    expect(readText(`${envelope}\u001e\u0004`).content).toBe(envelope);
  });

  // A camera reports the FNC1 that opens a GS1 symbol and a laser scanner
  // does not; the same label must read the same from both, or the registry
  // learns it twice.
  it('.19 .69 reads a label identically with or without the leading separator', () => {
    const laser = readText('0109501101530003' + '10AB');
    const camera = readText(`${GS}0109501101530003` + '10AB');
    expect(camera).toEqual(laser);
  });

  /*
   * One label, three scanners (2026-09-23). The Honeywell reports the GS1
   * marker out of band; MLKit puts it IN the text — a leading separator for
   * a DataMatrix, a literal "]C1" for GS1-128. All must be one code.
   */
  it('.69 reads MLKit’s in-text GS1 markers the same as the Honeywell’s', () => {
    const label = `016036658250798921100000087118${GS}1726013110U013383${GS}3072`;
    const honeywell = readScan({ kind: 'text', text: label, aimId: ']d2' });
    const cameraMatrix = readScan({ kind: 'text', text: GS + label, format: 'DATA_MATRIX' });
    expect(cameraMatrix).toEqual(honeywell);

    const honeywell128 = readScan({ kind: 'text', text: '0150382903018883', aimId: ']C1' });
    const camera128 = readScan({ kind: 'text', text: ']C10150382903018883', format: 'CODE_128' });
    expect(camera128).toEqual(honeywell128);
    expect(scanCode(camera128)).toBe('50382903018883');
  });

  it('lifts an AIM identifier out of the text', () => {
    const read = readText(']C121123456');
    expect(read).toEqual({
      kind: 'gs1',
      content: '21123456',
      elements: [{ ai: '21', data: '123456' }],
    });
  });
});

describe('structured or raw', () => {
  it('.14 reads a GS1 label into its elements', () => {
    expect(readText('01095011015300031714070410AB-123')).toEqual({
      kind: 'gs1',
      content: '01095011015300031714070410AB-123',
      elements: [
        { ai: '01', data: '09501101530003' },
        { ai: '17', data: '140704' },
        { ai: '10', data: 'AB-123' },
      ],
    });
  });

  it('.16 .17 leaves an ordinary barcode as raw content, not an error', () => {
    expect(readText('1012345678901')).toEqual({ kind: 'raw', content: '1012345678901' });
    expect(readText('not-a-valid-gs1-barcode').kind).toBe('raw');
  });

  it('believes the decoder when it says GS1', () => {
    expect(readText('21123456', ']d2').kind).toBe('gs1');
    expect(readText('21123456').kind).toBe('raw');
  });

  it('reads an empty scan as empty raw content', () => {
    expect(readText('  ')).toEqual({ kind: 'raw', content: '' });
  });
});

describe('reading the hardware layer’s scans', () => {
  it('passes the decoder’s AIM identifier through', () => {
    expect(readScan({ kind: 'text', text: '21123456', aimId: ']C1' }).kind).toBe('gs1');
  });

  // A report in no known framing cannot be told apart from its label — the
  // old fallback leaked the length byte and symbology code into the code.
  // So it is not a code at all, however plausible its characters look.
  it('.72 reads a HID report in no known framing as unreadable', () => {
    const bytes = new Uint8Array([...'0109501101530003'].map(c => c.charCodeAt(0)));
    const read = readScan({ kind: 'bytes', bytes });
    expect(read).toEqual({ kind: 'unreadable', content: '0109501101530003' });
    expect(scanCode(read)).toBeUndefined();
    expect(itemNumber(read)).toBeUndefined();
    expect(labelFields(read, today)).toEqual({});
  });

  it('reads a report flagged as continuing as unreadable, not truncated', () => {
    const report = new Uint8Array(63);
    const part = '0109501101530003';
    report.set([part.length, 0, ...[...']d2', ...part].map(c => c.charCodeAt(0))]);
    report[62] = 1;
    expect(readScan({ kind: 'bytes', bytes: report }).kind).toBe('unreadable');
  });

  // Captured 2026-09-23: one label, read in HID mode and in keyboard mode.
  // The report's framing carries "]d2", which is what makes it GS1 at all —
  // and both reads must be one code, or the registry learns the label twice.
  it('.69 reads a framed HID report the same as the keyboard read of it', () => {
    const report = new Uint8Array(63);
    const label = `016036658250798921100000087118${GS}1726013110U013383${GS}3072`;
    report.set([label.length, 0, ...[...']d2', ...label].map(c => c.charCodeAt(0))]);
    report[61] = 0x77;
    const hid = readScan({ kind: 'bytes', bytes: report });
    expect(hid.kind).toBe('gs1');
    expect(hid).toEqual(readText(label));
    expect(scanCode(hid)).toBe('60366582507989');
  });

  it('decodes keystrokes', () => {
    const keys = [...'ABCDE'].map(c => ({ code: `Key${c}`, shift: true, alt: false, ctrl: false }));
    expect(readScan({ kind: 'keystrokes', keys })).toEqual({ kind: 'raw', content: 'ABCDE' });
  });
});

describe('the code a scan is looked up by', () => {
  it('is the item number where the label carried one', () => {
    expect(scanCode(readText('01095011015300031714070410AB-123'))).toBe('09501101530003');
  });

  it('is the raw content otherwise', () => {
    expect(scanCode(readText('1012345678901'))).toBe('1012345678901');
  });

  // The batch-and-expiry half of a two-barcode box: looking it up by its
  // whole text can never match, and learning that text would attach it to
  // an item for good (OMS-REG-BAC-01.67).
  it('.67 is nothing for a GS1 label with no item number', () => {
    expect(scanCode(readText('21123456', ']C1'))).toBeUndefined();
    expect(scanCode(readText(`1726013110U013383${GS}3072`))).toBeUndefined();
  });

  it('.68 is nothing for an empty scan', () => {
    expect(scanCode(readText(' \u200B '))).toBeUndefined();
  });

  it('.65 is a retail barcode exactly as printed', () => {
    expect(scanCode(readText('09300657270520'))).toBe('09300657270520');
    expect(scanCode(readText('9300657270520'))).toBe('9300657270520');
  });
});

describe('the item number', () => {
  it('is a structured label’s AI 01', () => {
    expect(itemNumber(readText('0150382903018883'))).toBe('50382903018883');
  });

  // A retail barcode IS the product's item number, printed without markers —
  // what makes it worth learning where other plain codes are not.
  it('is a whole retail barcode with a valid check digit', () => {
    expect(itemNumber(readText('9300657270520'))).toBe('9300657270520'); // EAN-13
    expect(itemNumber(readText('036000291452'))).toBe('036000291452'); // UPC-A
    expect(itemNumber(readText('96385074'))).toBe('96385074'); // EAN-8
    expect(itemNumber(readText('10012345678902'))).toBe('10012345678902'); // ITF-14
  });

  it('is nothing for a plain code that is not a retail barcode', () => {
    expect(itemNumber(readText('9300657270521'))).toBeUndefined(); // bad check digit
    expect(itemNumber(readText('PX27052/C'))).toBeUndefined();
    expect(itemNumber(readText('123456789'))).toBeUndefined(); // 9 digits
  });

  it('is nothing for a structured label without AI 01', () => {
    expect(itemNumber(readText(`1726013110U013383${GS}3072`))).toBeUndefined();
  });

  it('is pre-filled from a retail barcode', () => {
    expect(labelFields(readText('9300657270520'), today)).toEqual({
      itemNumber: '9300657270520',
    });
  });
});

describe('what a stock screen pre-fills', () => {
  it('.14 .15 reads the six fields', () => {
    const read = readText(
      `0109501101530003` + `17261200` + `11250115` + `10LOT-7${GS}` + `3024${GS}` + `3712`
    );
    expect(labelFields(read, today)).toEqual({
      itemNumber: '09501101530003',
      batch: 'LOT-7',
      expiryDate: '2026-12-31',
      manufactureDate: '2025-01-15',
      quantity: 24,
      packSize: 12,
    });
  });

  it('.16 is empty for raw content', () => {
    expect(labelFields(readText('ABC-123'), today)).toEqual({});
  });

  it('omits what the label did not carry', () => {
    expect(labelFields(readText('0109501101530003'), today)).toEqual({
      itemNumber: '09501101530003',
    });
  });

  it('omits a zero quantity rather than pre-filling it', () => {
    expect(labelFields(readText(`0109501101530003300${GS}`), today)).toEqual({
      itemNumber: '09501101530003',
    });
  });

  it('.71 keeps the element but omits a date that does not exist', () => {
    const read = readText('0109501101530003' + '17270229');
    expect(read.kind).toBe('gs1');
    expect(labelFields(read, today).expiryDate).toBeUndefined();
  });
});
