/*
 * Self-contained QR Code encoder — no runtime dependency.
 *
 * Why vendored: the reference app draws its Settings server-info QR with
 * `react-qr-code`, a React library that can't run here, and adding a QR
 * dependency is a per-PR bundle-size event that "needs to be worth it"
 * (kdd/bundling). A QR encoder is a small, self-contained pure algorithm
 * with no DOM/runtime needs — exactly the "lean on our own code before a
 * library" case (CLAUDE.md anti-defaults, kdd/explicit-composition). So we
 * own ~one file of encoder and render the module matrix as SVG ourselves
 * (see QrCode.tsx), matching react-qr-code's SVG output.
 *
 * Ported and trimmed from Project Nayuki's "QR Code generator library"
 * (https://www.nayuki.io/page/qr-code-generator-library), MIT License,
 * Copyright (c) Project Nayuki. Trimmed to the byte/text encoding path this
 * app needs (a short server URL); numeric/alphanumeric/ECI segment modes and
 * the SVG/string emitters from the original are dropped. The algorithm — data
 * codewords, Reed–Solomon ECC, matrix layout, and mask selection — is
 * unchanged and standard (ISO/IEC 18004), so it stays correct without our
 * having to re-derive it.
 */

/**
 * Error correction level for a QR Code symbol — Low ~7%, Medium ~15%,
 * Quartile ~25%, High ~30% recoverable. A const object rather than an `enum`
 * (the repo's `erasableSyntaxOnly` bans runtime enums); the values are the
 * ECC-table indices below, so they must stay 0..3 in this order.
 */
export const QrEcc = {
  Low: 0,
  Medium: 1,
  Quartile: 2,
  High: 3,
} as const;

export type QrEcc = (typeof QrEcc)[keyof typeof QrEcc];

// Format-info bits (2) per ECC level, indexed by the QrEcc value.
const ECC_FORMAT_BITS: readonly number[] = [1, 0, 3, 2];

/**
 * A finished QR Code symbol: a square grid of dark/light modules.
 * Read modules with {@link getModule}; `size` is the side length in modules.
 */
export class QrCode {
  /** The QR Code version (symbol size family), 1..40. */
  public readonly version: number;
  /** The error-correction level used. */
  public readonly errorCorrectionLevel: QrEcc;
  /** The side length of the grid, in modules (21..177). */
  public readonly size: number;

  // Row-major grid of module colours; true = dark. Includes function patterns.
  private readonly modules: boolean[][] = [];
  // Which cells are function patterns (immune to masking).
  private readonly isFunction: boolean[][] = [];

  /**
   * Encode `text` (UTF-8, byte mode) at the given minimum ECC level, picking
   * the smallest version (1..40) that fits. Throws if the text is too long
   * for version 40 at `ecc`.
   */
  public static encodeText(text: string, ecc: QrEcc): QrCode {
    const data = QrCode.toUtf8Bytes(text);
    return QrCode.encodeBytes(data, ecc);
  }

  /** Encode raw bytes in byte mode; see {@link encodeText}. */
  public static encodeBytes(data: readonly number[], ecc: QrEcc): QrCode {
    // Byte-mode segment: 4-bit mode indicator + char-count + 8 bits per byte.
    // Find the smallest version whose data capacity holds the segment.
    let version = MIN_VERSION;
    let dataUsedBits = 0;
    for (; ; version++) {
      const capacityBits = QrCode.dataCapacityBits(version, ecc);
      const ccBits = version <= 9 ? 8 : 16; // byte-mode char-count width
      dataUsedBits = 4 + ccBits + data.length * 8;
      if (dataUsedBits <= capacityBits) break;
      if (version >= MAX_VERSION)
        throw new RangeError('Data too long for a QR Code');
    }

    const bits: number[] = [];
    appendBits(0b0100, 4, bits); // byte mode indicator
    appendBits(data.length, version <= 9 ? 8 : 16, bits);
    for (const b of data) appendBits(b, 8, bits);

    // Terminator + bit padding to a byte boundary.
    const capacityBits = QrCode.dataCapacityBits(version, ecc);
    appendBits(0, Math.min(4, capacityBits - bits.length), bits);
    appendBits(0, (8 - (bits.length % 8)) % 8, bits);

    // Byte padding with the two alternating pad codewords.
    for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11)
      appendBits(pad, 8, bits);

    // Pack bits into codewords (big-endian per byte).
    const dataCodewords: number[] = new Array(bits.length >>> 3).fill(0);
    bits.forEach((bit, i) => {
      dataCodewords[i >>> 3] |= bit << (7 - (i & 7));
    });

    return new QrCode(version, ecc, dataCodewords);
  }

  private constructor(
    version: number,
    errorCorrectionLevel: QrEcc,
    dataCodewords: readonly number[]
  ) {
    if (version < MIN_VERSION || version > MAX_VERSION)
      throw new RangeError('Version out of range');
    this.version = version;
    this.errorCorrectionLevel = errorCorrectionLevel;
    this.size = version * 4 + 17;

    const row: boolean[] = new Array(this.size).fill(false);
    for (let y = 0; y < this.size; y++) {
      this.modules.push(row.slice());
      this.isFunction.push(row.slice());
    }

    this.drawFunctionPatterns();
    const allCodewords = this.addEccAndInterleave(dataCodewords);
    this.drawCodewords(allCodewords);

    // Pick the mask (0..7) minimising the penalty score.
    let bestMask = 0;
    let minPenalty = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      this.applyMask(mask);
      this.drawFormatBits(mask);
      const penalty = this.getPenaltyScore();
      if (penalty < minPenalty) {
        bestMask = mask;
        minPenalty = penalty;
      }
      this.applyMask(mask); // XOR is its own inverse — undo before next trial.
    }
    this.applyMask(bestMask);
    this.drawFormatBits(bestMask);
  }

  /** Dark (true) or light (false) module at (x, y); out-of-range → light. */
  public getModule(x: number, y: number): boolean {
    return (
      x >= 0 && x < this.size && y >= 0 && y < this.size && this.modules[y][x]
    );
  }

  // ---- Function-pattern drawing -----------------------------------------

  private drawFunctionPatterns(): void {
    // Timing patterns along row/col 6.
    for (let i = 0; i < this.size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }

    // Three finder patterns at the corners (with separators).
    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(this.size - 4, 3);
    this.drawFinderPattern(3, this.size - 4);

    // Alignment patterns on the grid of positions (skipping finder overlaps).
    const alignPositions = this.getAlignmentPatternPositions();
    const n = alignPositions.length;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        if (
          (i === 0 && j === 0) ||
          (i === 0 && j === n - 1) ||
          (i === n - 1 && j === 0)
        )
          continue;
        this.drawAlignmentPattern(alignPositions[i], alignPositions[j]);
      }

    // Reserve format/version areas (filled with real bits later).
    this.drawFormatBits(0);
    this.drawVersion();
  }

  private drawFinderPattern(x: number, y: number): void {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy)); // Chebyshev distance
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size)
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
      }
  }

  private drawAlignmentPattern(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++)
        this.setFunctionModule(
          x + dx,
          y + dy,
          Math.max(Math.abs(dx), Math.abs(dy)) !== 1
        );
  }

  private drawFormatBits(mask: number): void {
    // 5 data bits: 2 ECC + 3 mask; append 10 BCH error-correction bits.
    const data = (ECC_FORMAT_BITS[this.errorCorrectionLevel] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412; // masked per spec

    // First copy: around the top-left finder.
    for (let i = 0; i <= 5; i++) this.setFunctionModule(8, i, getBit(bits, i));
    this.setFunctionModule(8, 7, getBit(bits, 6));
    this.setFunctionModule(8, 8, getBit(bits, 7));
    this.setFunctionModule(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++)
      this.setFunctionModule(14 - i, 8, getBit(bits, i));

    // Second copy: split across the other two finders (+ the dark module).
    for (let i = 0; i < 8; i++)
      this.setFunctionModule(this.size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i++)
      this.setFunctionModule(8, this.size - 15 + i, getBit(bits, i));
    this.setFunctionModule(8, this.size - 8, true); // always-dark module
  }

  private drawVersion(): void {
    if (this.version < 7) return;
    // 6 data bits + 12 BCH bits.
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = getBit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunctionModule(a, b, bit);
      this.setFunctionModule(b, a, bit);
    }
  }

  private setFunctionModule(x: number, y: number, isDark: boolean): void {
    this.modules[y][x] = isDark;
    this.isFunction[y][x] = true;
  }

  // ---- Error correction + data placement --------------------------------

  private addEccAndInterleave(data: readonly number[]): number[] {
    const ver = this.version;
    const ecc = this.errorCorrectionLevel;
    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecc][ver];
    const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecc][ver];
    const rawCodewords = Math.floor(QrCode.getNumRawDataModules(ver) / 8);
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);

    const blocks: number[][] = [];
    const rsDiv = QrCode.reedSolomonComputeDivisor(blockEccLen);
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
      const dat = data.slice(k, k + datLen);
      k += datLen;
      const block = dat.slice();
      const eccBytes = QrCode.reedSolomonComputeRemainder(dat, rsDiv);
      if (i < numShortBlocks) block.push(0); // pad short blocks for interleave
      block.push(...eccBytes);
      blocks.push(block);
    }

    // Interleave the codewords column-by-column across blocks.
    const result: number[] = [];
    for (let i = 0; i < blocks[0].length; i++)
      blocks.forEach((block, j) => {
        // Skip the padding cell of short blocks in the data region.
        if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks)
          result.push(block[i]);
      });
    return result;
  }

  private drawCodewords(data: readonly number[]): void {
    let i = 0; // bit index into data
    // Zigzag up the two-module-wide columns, right to left.
    for (let right = this.size - 1; right >= 1; right -= 2) {
      const col = right === 6 ? 5 : right; // skip the vertical timing column
      for (let vert = 0; vert < this.size; vert++)
        for (let j = 0; j < 2; j++) {
          const x = col - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
    }
  }

  // ---- Masking + scoring -------------------------------------------------

  private applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++)
      for (let x = 0; x < this.size; x++) {
        let invert: boolean;
        switch (mask) {
          case 0:
            invert = (x + y) % 2 === 0;
            break;
          case 1:
            invert = y % 2 === 0;
            break;
          case 2:
            invert = x % 3 === 0;
            break;
          case 3:
            invert = (x + y) % 3 === 0;
            break;
          case 4:
            invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
            break;
          case 5:
            invert = ((x * y) % 2) + ((x * y) % 3) === 0;
            break;
          case 6:
            invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
            break;
          case 7:
            invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
            break;
          default:
            throw new RangeError('Mask out of range');
        }
        if (invert && !this.isFunction[y][x])
          this.modules[y][x] = !this.modules[y][x];
      }
  }

  private getPenaltyScore(): number {
    let result = 0;
    const size = this.size;
    const N1 = 3;
    const N2 = 3;
    const N3 = 40;
    const N4 = 10;

    // Adjacent same-colour runs, per row and per column.
    for (let y = 0; y < size; y++) {
      let runColor = false;
      let runX = 0;
      const runHistory = [0, 0, 0, 0, 0, 0, 0];
      for (let x = 0; x < size; x++) {
        if (this.modules[y][x] === runColor) {
          runX++;
          if (runX === 5) result += N1;
          else if (runX > 5) result++;
        } else {
          this.finderPenaltyAddHistory(runX, runHistory);
          if (!runColor)
            result += this.finderPenaltyCountPatterns(runHistory) * N3;
          runColor = this.modules[y][x];
          runX = 1;
        }
      }
      result +=
        this.finderPenaltyTerminateAndCount(runColor, runX, runHistory) * N3;
    }
    for (let x = 0; x < size; x++) {
      let runColor = false;
      let runY = 0;
      const runHistory = [0, 0, 0, 0, 0, 0, 0];
      for (let y = 0; y < size; y++) {
        if (this.modules[y][x] === runColor) {
          runY++;
          if (runY === 5) result += N1;
          else if (runY > 5) result++;
        } else {
          this.finderPenaltyAddHistory(runY, runHistory);
          if (!runColor)
            result += this.finderPenaltyCountPatterns(runHistory) * N3;
          runColor = this.modules[y][x];
          runY = 1;
        }
      }
      result +=
        this.finderPenaltyTerminateAndCount(runColor, runY, runHistory) * N3;
    }

    // 2x2 blocks of one colour.
    for (let y = 0; y < size - 1; y++)
      for (let x = 0; x < size - 1; x++) {
        const c = this.modules[y][x];
        if (
          c === this.modules[y][x + 1] &&
          c === this.modules[y + 1][x] &&
          c === this.modules[y + 1][x + 1]
        )
          result += N2;
      }

    // Balance of dark vs light modules.
    let dark = 0;
    for (const rowArr of this.modules)
      for (const cell of rowArr) if (cell) dark++;
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += k * N4;
    return result;
  }

  private finderPenaltyCountPatterns(runHistory: readonly number[]): number {
    const n = runHistory[1];
    const core =
      n > 0 &&
      runHistory[2] === n &&
      runHistory[3] === n * 3 &&
      runHistory[4] === n &&
      runHistory[5] === n;
    return (
      (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0) +
      (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0)
    );
  }

  private finderPenaltyTerminateAndCount(
    currentRunColor: boolean,
    currentRunLength: number,
    runHistory: number[]
  ): number {
    let runLen = currentRunLength;
    if (currentRunColor) {
      this.finderPenaltyAddHistory(runLen, runHistory);
      runLen = 0;
    }
    runLen += this.size; // add light border to final run
    this.finderPenaltyAddHistory(runLen, runHistory);
    return this.finderPenaltyCountPatterns(runHistory);
  }

  private finderPenaltyAddHistory(
    currentRunLength: number,
    runHistory: number[]
  ): void {
    if (runHistory[0] === 0) currentRunLength += this.size; // add light border
    runHistory.pop();
    runHistory.unshift(currentRunLength);
  }

  // ---- Static helpers ----------------------------------------------------

  private getAlignmentPatternPositions(): number[] {
    if (this.version === 1) return [];
    const numAlign = Math.floor(this.version / 7) + 2;
    const step =
      this.version === 32
        ? 26
        : Math.ceil((this.version * 4 + 4) / (numAlign * 2 - 2)) * 2;
    const result = [6];
    for (let pos = this.size - 7; result.length < numAlign; pos -= step)
      result.splice(1, 0, pos);
    return result;
  }

  private static getNumRawDataModules(ver: number): number {
    let result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36; // version-info modules
    }
    return result;
  }

  private static dataCapacityBits(ver: number, ecc: QrEcc): number {
    return (
      Math.floor(QrCode.getNumRawDataModules(ver) / 8) * 8 -
      ECC_CODEWORDS_PER_BLOCK[ecc][ver] *
        NUM_ERROR_CORRECTION_BLOCKS[ecc][ver] *
        8
    );
  }

  private static reedSolomonComputeDivisor(degree: number): number[] {
    const result: number[] = new Array(degree).fill(0);
    result[degree - 1] = 1; // monomial x^0
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < result.length; j++) {
        result[j] = QrCode.reedSolomonMultiply(result[j], root);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      root = QrCode.reedSolomonMultiply(root, 0x02);
    }
    return result;
  }

  private static reedSolomonComputeRemainder(
    data: readonly number[],
    divisor: readonly number[]
  ): number[] {
    const result: number[] = new Array(divisor.length).fill(0);
    for (const b of data) {
      const factor = b ^ (result.shift() as number);
      result.push(0);
      divisor.forEach((coef, i) => {
        result[i] ^= QrCode.reedSolomonMultiply(coef, factor);
      });
    }
    return result;
  }

  private static reedSolomonMultiply(x: number, y: number): number {
    // GF(2^8) multiplication modulo 0x11D.
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
  }

  private static toUtf8Bytes(str: string): number[] {
    const escaped = encodeURI(str);
    const bytes: number[] = [];
    for (let i = 0; i < escaped.length; i++) {
      if (escaped.charAt(i) === '%') {
        bytes.push(parseInt(escaped.substring(i + 1, i + 3), 16));
        i += 2;
      } else {
        bytes.push(escaped.charCodeAt(i));
      }
    }
    return bytes;
  }
}

const MIN_VERSION = 1;
const MAX_VERSION = 40;

// Per-block ECC codewords, indexed [ecc][version] (index 0 unused).
const ECC_CODEWORDS_PER_BLOCK: readonly (readonly number[])[] = [
  // L
  [
    -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30,
    28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30, 30,
  ],
  // M
  [
    -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26,
    26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
    28, 28, 28,
  ],
  // Q
  [
    -1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28,
    26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30, 30,
  ],
  // H
  [
    -1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28,
    26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30, 30,
  ],
];

// Number of ECC blocks, indexed [ecc][version] (index 0 unused).
const NUM_ERROR_CORRECTION_BLOCKS: readonly (readonly number[])[] = [
  // L
  [
    -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10,
    12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
  ],
  // M
  [
    -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17,
    17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
  ],
  // Q
  [
    -1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23,
    23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68,
  ],
  // H
  [
    -1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25,
    25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77,
    81,
  ],
];

function appendBits(val: number, len: number, bits: number[]): void {
  if (len < 0 || len > 31 || val >>> len !== 0)
    throw new RangeError('Value out of range');
  for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
}

function getBit(x: number, i: number): boolean {
  return ((x >>> i) & 1) !== 0;
}
