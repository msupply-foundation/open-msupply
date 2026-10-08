// Keyboard-wedge keystrokes → the characters they stand for.
//
// A wedge scanner sends KEY POSITIONS (`KeyboardEvent.code`), and which
// character a position means depends on the keyboard layout the scanner is
// emitting against. On a US layout the OS's own mapping looks perfect; on
// AZERTY the `KeyA` position yields "q" and the barcode is silently wrong. So
// capture (src/platform/barcodeSources/wedgeDetect.ts) hands up positions
// only, and the mapping lives here: an assumption about a particular scanner,
// which a site may one day need to configure.
//
// The table is the US layout, which is what scanners emit by default. If a
// scanner's own keyboard-country setting is changed off US it emits non-US
// positions and this table is wrong too — scanner configuration, beyond the
// app's reach, and one more reason report mode is preferred where a device
// supports it.
//
// Every table below is typed against capture's position lists, so a position
// capture accepts as a character but this file cannot map is a compile
// error — never a character dropped from a code the registry keys on
// exactly.

import {
  classifyKey,
  type ControlPosition,
  type NumpadSymbolPosition,
  type PunctuationPosition,
} from '@/platform/barcodeSources/wedgeDetect';
import type { ScanKey } from '@/platform/barcodeSources/source';

/** The GS1 field separator. Report mode delivers it as this byte directly. */
export const FNC1 = String.fromCharCode(29);

/** US-layout punctuation, by position: [unshifted, shifted]. */
const PUNCTUATION: Record<PunctuationPosition, [string, string]> = {
  Minus: ['-', '_'],
  Equal: ['=', '+'],
  BracketLeft: ['[', '{'],
  BracketRight: [']', '}'],
  Backslash: ['\\', '|'],
  Semicolon: [';', ':'],
  Quote: ["'", '"'],
  Comma: [',', '<'],
  Period: ['.', '>'],
  Slash: ['/', '?'],
  Backquote: ['`', '~'],
  Space: [' ', ' '],
};

/** The shifted face of each digit row key, US layout. */
const SHIFTED_DIGITS = [')', '!', '@', '#', '$', '%', '^', '&', '*', '('];

/** The numeric keypad's symbol keys. */
const NUMPAD: Record<NumpadSymbolPosition, string> = {
  NumpadDecimal: '.',
  NumpadAdd: '+',
  NumpadSubtract: '-',
  NumpadMultiply: '*',
  NumpadDivide: '/',
};

/**
 * Ctrl + key → the ASCII control character it stands for.
 *
 * This is how a keyboard has always expressed the C0 controls, and it is how
 * a scanner in keyboard-emulation mode sends a byte that has no key of its
 * own. The one that matters is Ctrl+] = 0x1D = GS = the GS1 field separator:
 * without it a label whose variable-length field is followed by another
 * field cannot be split, and that is unrecoverable further up — nothing
 * downstream can tell where the serial ended.
 */
const CONTROL_CODES: Record<ControlPosition, number> = {
  BracketLeft: 0x1b, // ESC
  Backslash: 0x1c, // FS
  BracketRight: 0x1d, // GS — the GS1 field separator
  Digit6: 0x1e, // RS
  Minus: 0x1f, // US
};

const lookup = <T extends string, V>(table: Record<T, V>, code: string): V | undefined =>
  Object.prototype.hasOwnProperty.call(table, code)
    ? table[code as T]
    : undefined;

export type DecodedKey =
  /** A character to append. */
  | { kind: 'char'; value: string }
  /**
   * One digit of an Alt+numpad code-entry sequence — `Alt+0029` for the GS1
   * separator. Means nothing on its own; the sequence composes into a single
   * character (see keysToText).
   */
  | { kind: 'alt-digit'; digit: string }
  /** No character: a modifier, a terminator, or a key a barcode cannot hold. */
  | { kind: 'none' };

export const decodeKey = ({ code, shift, alt, ctrl }: ScanKey): DecodedKey => {
  // The field separator has three spellings in the wild, and all must land
  // on the same character or one physical label becomes two registry rows.
  // Two are single keys: ZKTeco sends F8, and Ctrl+] is the standard
  // keyboard spelling of the byte itself. The third is Zebra's, and is not a
  // key at all but an Alt+numpad SEQUENCE (below).
  if (code === 'F8') return { kind: 'char', value: FNC1 };

  // Windows Alt-code entry: Alt held while decimal digits are typed on the
  // keypad, composing one character — Alt+0029 is the GS1 separator. Only
  // the host composes it, and only on Windows, so everywhere else the raw
  // keystrokes arrive and have to be composed here. The reference app reads
  // just the first of them ("Numpad0 with alt held") and emits a separator
  // for it, which yields two separators per real one and drops the digits
  // that say which character was meant.
  if (alt && /^Numpad\d$/.test(code)) {
    return { kind: 'alt-digit', digit: code.slice(6) };
  }

  if (ctrl) {
    // Ctrl+A…Ctrl+Z are 0x01…0x1A.
    if (code.startsWith('Key') && code.length === 4) {
      const offset = (code.charCodeAt(3) - 64) & 0x1f;
      return { kind: 'char', value: String.fromCharCode(offset) };
    }
    const control = lookup(CONTROL_CODES, code);
    return control === undefined
      ? { kind: 'none' }
      : { kind: 'char', value: String.fromCharCode(control) };
  }

  if (code.startsWith('Key') && code.length === 4) {
    const letter = code.slice(3);
    // Case from the shift modifier. The reference app drops this entirely and
    // uppercases everything, which is the single largest source of the
    // wedge/report mismatch.
    return { kind: 'char', value: shift ? letter : letter.toLowerCase() };
  }

  if (/^Digit\d$/.test(code)) {
    const digit = Number(code.slice(5));
    return {
      kind: 'char',
      value: shift ? (SHIFTED_DIGITS[digit] as string) : String(digit),
    };
  }

  if (/^Numpad\d$/.test(code)) return { kind: 'char', value: code.slice(6) };

  const numpad = lookup(NUMPAD, code);
  if (numpad !== undefined) return { kind: 'char', value: numpad };

  const punctuation = lookup(PUNCTUATION, code);
  if (punctuation !== undefined) {
    return { kind: 'char', value: punctuation[shift ? 1 : 0] };
  }

  return { kind: 'none' };
};

/** Keystrokes → the characters they mean, composing Alt+numpad sequences. */
export const keysToText = (keys: ScanKey[]): string => {
  let out = '';
  let altDigits = '';

  const compose = () => {
    if (altDigits === '') return;
    const code = Number(altDigits);
    // Alt+0029 is the separator; anything outside the code-point range is
    // not a code entry at all and is discarded rather than guessed at.
    if (Number.isInteger(code) && code > 0 && code <= 0x10ffff) {
      out += String.fromCodePoint(code);
    }
    altDigits = '';
  };

  for (const key of keys) {
    const decoded = decodeKey(key);
    if (decoded.kind === 'alt-digit') {
      altDigits += decoded.digit;
      continue;
    }
    // A modifier carries nothing and must not break a sequence it sits
    // inside — a scanner brackets its Alt+numpad run with NumLock.
    if (classifyKey(key) === 'ignore') continue;
    compose();
    if (decoded.kind === 'char') out += decoded.value;
  }
  compose();
  return out;
};
