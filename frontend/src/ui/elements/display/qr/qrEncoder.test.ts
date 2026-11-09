import { describe, expect, it } from 'vitest';
import { QrCode, QrEcc } from './qrEncoder';

// Serialise a symbol's module grid to one '0'/'1' string per row.
const toRows = (qr: QrCode): string[] => {
  const rows: string[] = [];
  for (let y = 0; y < qr.size; y++) {
    let row = '';
    for (let x = 0; x < qr.size; x++) row += qr.getModule(x, y) ? '1' : '0';
    rows.push(row);
  }
  return rows;
};

describe('qrEncoder', () => {
  it('picks the smallest version that fits and sizes the grid as version*4+17', () => {
    // Short URL fits v2 (25); a longer one needs a bigger version.
    const small = QrCode.encodeText('http://localhost', QrEcc.Medium);
    expect(small.version).toBe(2);
    expect(small.size).toBe(25);

    const bigger = QrCode.encodeText(
      'https://demo.msupply.foundation/graphql',
      QrEcc.Medium
    );
    expect(bigger.size).toBe(bigger.version * 4 + 17);
    expect(bigger.version).toBeGreaterThan(small.version);
  });

  it('lays down the three finder patterns at the corners', () => {
    const qr = QrCode.encodeText('x', QrEcc.Low);
    const n = qr.size;
    // A finder is a dark 7x7 ring; sample its outer corner + light centre gap.
    for (const [ox, oy] of [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ]) {
      expect(qr.getModule(ox, oy)).toBe(true); // outer ring dark
      expect(qr.getModule(ox + 1, oy + 1)).toBe(false); // separator gap
      expect(qr.getModule(ox + 3, oy + 3)).toBe(true); // solid 3x3 core
    }
  });

  it('is deterministic — a fixed input reproduces its golden matrix', () => {
    // Frozen after independent jsQR round-trip verification of this exact
    // input/ECC; guards mask selection, ECC tables, and placement together.
    const qr = QrCode.encodeText(
      'https://demo.msupply.foundation/graphql',
      QrEcc.Medium
    );
    expect(qr.version).toBe(3);
    expect(toRows(qr)).toEqual([
      '11111110011111110111001111111',
      '10000010111101010011001000001',
      '10111010010010101001001011101',
      '10111010011000111011001011101',
      '10111010101110010001001011101',
      '10000010001001011111001000001',
      '11111110101010101010101111111',
      '00000000001001110110100000000',
      '10101010010111001101100010010',
      '01111100111000001000011101001',
      '10101010100000001100010100111',
      '00101101110011000101011010010',
      '11011111100110100101011001011',
      '01101100101110001100111001001',
      '11001111001111000000110111011',
      '01110000110000001101100011010',
      '11101010010110001101111001011',
      '01000001100111001100101001101',
      '10110010100010100010101110011',
      '01000101110001101111001001010',
      '10100010000100111100111110000',
      '00000000111100100110100010111',
      '11111110000001001001101011011',
      '10000010010010001100100011001',
      '10111010111000011100111110011',
      '10111010000011001001000110111',
      '10111010100000100010110111001',
      '10000010011000001110100100010',
      '11111110101000111101111110011',
    ]);
  });

  it('encodes multibyte UTF-8 (byte mode) without throwing', () => {
    const qr = QrCode.encodeText('短い日本語テスト', QrEcc.High);
    expect(qr.size).toBeGreaterThan(0);
  });

  it('throws when the payload cannot fit version 40', () => {
    expect(() => QrCode.encodeText('a'.repeat(3000), QrEcc.High)).toThrow(
      /too long/i
    );
  });
});
