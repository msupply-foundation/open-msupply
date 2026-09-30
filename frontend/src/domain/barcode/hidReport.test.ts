import { describe, expect, it } from 'vitest';
import { decodeHidReport } from './hidReport';

const GS = String.fromCharCode(29);
const ascii = (text: string) => [...text].map(c => c.charCodeAt(0));
const hex = (text: string) => text.split(' ').map(b => parseInt(b, 16));

/*
 * Captured from real hardware, 2026-09-23: the Test scanner screen's raw
 * readout for labels also read in keyboard-emulation mode. The assertion
 * that matters is byte-identity with those wedge reads — one physical label
 * must be one registry code whichever mode the scanner is in.
 */
const CAPTURED = {
  gs1DataMatrix:
    '35 00 5d 64 32 30 31 36 30 33 36 36 35 38 32 35 30 37 39 38 39 32 31 31 30 30 30 30 30 30 38 37 31 31 38 1d 31 37 32 36 30 31 33 31 31 30 55 30 31 33 33 38 33 1d 33 30 37 32 00 00 00 77 00',
  gs1128:
    '16 00 5d 43 31 31 37 32 36 30 31 33 31 31 30 55 30 31 33 33 38 33 1d 33 30 37 32 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 3f 00',
  plainDataMatrix:
    '09 00 5d 64 31 50 58 32 37 30 35 32 2f 43 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 77 00',
  ean13:
    '0d 00 5d 58 39 39 33 30 30 36 35 37 32 37 30 35 32 30 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 64 00',
};

/*
 * The same labels through the desktop app, 2026-09-25: node-hid keeps the
 * report ID (02) that WebHID strips. Otherwise byte-identical to CAPTURED —
 * and the plain DataMatrix label here ends "/D" where CAPTURED's ends "/C",
 * a different label of the same kind.
 */
const CAPTURED_WITH_REPORT_ID = {
  gs1DataMatrix: `02 ${CAPTURED.gs1DataMatrix}`,
  gs1128: `02 ${CAPTURED.gs1128}`,
  plainDataMatrix:
    '02 09 00 5d 64 31 50 58 32 37 30 35 32 2f 44 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 77 00',
  ean13: `02 ${CAPTURED.ean13}`,
};

describe('the captured framing, with a report ID in front', () => {
  it('reads the same label as without it', () => {
    for (const key of ['gs1DataMatrix', 'gs1128', 'ean13'] as const) {
      expect(decodeHidReport(hex(CAPTURED_WITH_REPORT_ID[key]))).toEqual(
        decodeHidReport(hex(CAPTURED[key]))
      );
    }
    expect(decodeHidReport(hex(CAPTURED_WITH_REPORT_ID.plainDataMatrix))).toEqual({
      text: 'PX27052/D',
      aimId: ']d1',
      framed: true,
    });
  });

  it('accepts only a nonzero ID in front of an exact frame', () => {
    const zeroId = hex(`00 ${CAPTURED.ean13}`);
    expect(decodeHidReport(zeroId).framed).toBe(false);
    // One byte too many at the end is not a report ID at the front.
    const trailing = hex(`${CAPTURED.ean13} 00`);
    expect(decodeHidReport(trailing).framed).toBe(false);
  });
});

describe('the captured framing', () => {
  it('reads the label, and only the label', () => {
    // The same label in keyboard-emulation mode, character for character.
    expect(decodeHidReport(hex(CAPTURED.gs1DataMatrix))).toEqual({
      text: `016036658250798921100000087118${GS}1726013110U013383${GS}3072`,
      aimId: ']d2',
      framed: true,
    });
    expect(decodeHidReport(hex(CAPTURED.plainDataMatrix))).toEqual({
      text: 'PX27052/C',
      aimId: ']d1',
      framed: true,
    });
    expect(decodeHidReport(hex(CAPTURED.ean13))).toEqual({
      text: '9300657270520',
      aimId: ']X9',
      framed: true,
    });
  });

  it('keeps the separator inside the label', () => {
    expect(decodeHidReport(hex(CAPTURED.gs1128)).text).toBe(
      `1726013110U013383${GS}3072`
    );
  });

  // A length byte that disagrees with the padding means the report is not
  // in this framing, whatever it resembles.
  it('does not apply the framing to a report that does not match it', () => {
    const bytes = hex(CAPTURED.plainDataMatrix);
    bytes[0] = 0x05; // claims 5 bytes; "7052/C" follows
    expect(decodeHidReport(bytes).framed).toBe(false);
    expect(decodeHidReport(hex(CAPTURED.ean13).slice(0, 40)).framed).toBe(false);
  });
});

// What holds for a report in no known framing.
describe('an unrecognised report', () => {
  it('keeps the characters', () => {
    expect(decodeHidReport(ascii('ab-12/Cd.9'))).toEqual({
      text: 'ab-12/Cd.9',
      framed: false,
    });
  });

  // Dropping a separator silently merges two GS1 fields into one plausible
  // value — the corruption the reading layer above cannot detect or undo.
  it('keeps every GS1 field separator', () => {
    const bytes = [...ascii('0101'), 0x1d, ...ascii('10AB'), 0x1d, ...ascii('3072')];
    expect(decodeHidReport(bytes).text).toBe(`0101${GS}10AB${GS}3072`);
  });

  it('drops control bytes that cannot be part of a barcode', () => {
    expect(decodeHidReport([0x00, ...ascii('AB'), 0x16, 0x00]).text).toBe('AB');
  });

  it('does not trim — tidying belongs to the reading layer above', () => {
    expect(decodeHidReport(ascii('  AB  ')).text).toBe('  AB  ');
  });

  it('is empty for an empty report', () => {
    expect(decodeHidReport([]).text).toBe('');
  });
});
