import { describe, expect, it } from 'vitest';
import { decodeKey, FNC1, keysToText } from './keystrokes';
import {
  classifyKey,
  CONTROL_POSITIONS,
  NUMPAD_SYMBOL_POSITIONS,
  PUNCTUATION_POSITIONS,
  SEPARATOR_KEY_POSITIONS,
} from '@/platform/barcodeSources/wedgeDetect';
import type { ScanKey } from '@/platform/barcodeSources/source';

/** A keystroke as the browser would report it. */
const stroke = (
  code: string,
  mods: { shift?: boolean; alt?: boolean; ctrl?: boolean } = {}
): ScanKey => ({
  code,
  shift: mods.shift ?? false,
  alt: mods.alt ?? false,
  ctrl: mods.ctrl ?? false,
});

const key = (
  code: string,
  mods: { shift?: boolean; alt?: boolean; ctrl?: boolean } = {}
) => decodeKey(stroke(code, mods));

// A wedge scanner sends KEY POSITIONS, not characters — so the position is
// what gets decoded, against the US layout the scanner emits.
describe('decoding a key position', () => {
  it('restores case from the shift modifier', () => {
    // The reference app uppercases everything, losing this entirely — and the
    // registry matches codes "character for character, including case".
    expect(key('KeyA')).toEqual({ kind: 'char', value: 'a' });
    expect(key('KeyA', { shift: true })).toEqual({ kind: 'char', value: 'A' });
  });

  it('decodes digits, shifted and not', () => {
    expect(key('Digit1')).toEqual({ kind: 'char', value: '1' });
    expect(key('Digit1', { shift: true })).toEqual({ kind: 'char', value: '!' });
    expect(key('Digit0')).toEqual({ kind: 'char', value: '0' });
  });

  it('decodes the punctuation a batch number may legitimately contain', () => {
    // GS1 AI 10 permits these; the reference app deletes every one of them.
    expect(key('Minus')).toEqual({ kind: 'char', value: '-' });
    expect(key('Period')).toEqual({ kind: 'char', value: '.' });
    expect(key('Slash')).toEqual({ kind: 'char', value: '/' });
    expect(key('Minus', { shift: true })).toEqual({ kind: 'char', value: '_' });
  });

  it('decodes the numeric keypad', () => {
    expect(key('Numpad7')).toEqual({ kind: 'char', value: '7' });
    expect(key('NumpadDecimal')).toEqual({ kind: 'char', value: '.' });
  });

  // Both spellings must yield byte 29, or the same label read in report mode
  // and in wedge mode becomes two different registry keys.
  it('decodes the single-key spellings of the GS1 separator', () => {
    expect(key('F8')).toEqual({ kind: 'char', value: FNC1 });
    expect(key('BracketRight', { ctrl: true })).toEqual({
      kind: 'char',
      value: FNC1,
    });
    // A plain keypad zero is still a zero.
    expect(key('Numpad0')).toEqual({ kind: 'char', value: '0' });
  });

  /*
   * Zebra's spelling, captured 2026-09-17: the separator is not a key at all
   * but a Windows Alt-code entry — Alt held while 0 0 2 9 is typed on the
   * keypad, bracketed by NumLock. Only Windows composes it, so everywhere
   * else the raw keystrokes arrive and must be composed here.
   */
  it('composes an Alt+numpad sequence into one character', () => {
    const sequence = [
      stroke('NumLock'),
      stroke('Numpad0', { alt: true }),
      stroke('Numpad0', { alt: true }),
      stroke('Numpad2', { alt: true }),
      stroke('Numpad9', { alt: true }),
      stroke('NumLock'),
    ];
    expect(keysToText(sequence)).toBe(FNC1);
  });

  it('treats NumLock as carrying nothing', () => {
    expect(key('NumLock')).toEqual({ kind: 'none' });
  });

  // Real scanner evidence (a Symbol/Zebra 0x05E0:0x1200 in keyboard mode,
  // 2026-09-17): a GS1 label carrying 01/21/17/10 arrived with NO separator
  // in the keystroke log — but the log dropped every Ctrl combination before
  // recording it, so the separator was invisible rather than absent. Ctrl+]
  // IS the GS byte, and losing it makes a variable-length field unsplittable.
  it('decodes Ctrl+] as the GS1 separator', () => {
    expect(key('BracketRight', { ctrl: true })).toEqual({
      kind: 'char',
      value: FNC1,
    });
  });

  it('decodes the rest of the Ctrl control codes', () => {
    expect(key('KeyA', { ctrl: true })).toEqual({
      kind: 'char',
      value: String.fromCharCode(1),
    });
    expect(key('KeyM', { ctrl: true })).toEqual({
      kind: 'char',
      value: String.fromCharCode(13),
    });
    expect(key('Backslash', { ctrl: true })).toEqual({
      kind: 'char',
      value: String.fromCharCode(28),
    });
  });

  it('gives no character for keys that carry none', () => {
    expect(key('F5', { ctrl: true })).toEqual({ kind: 'none' });
    expect(key('ShiftLeft')).toEqual({ kind: 'none' });
    expect(key('Enter')).toEqual({ kind: 'none' });
    expect(key('Escape')).toEqual({ kind: 'none' });
  });

  // Capture decides a position is a character without knowing which one;
  // this table must then be able to say which. Any position capture accepts
  // that decodes to nothing here would be a character silently dropped from
  // a code the registry keys on exactly.
  it('maps every position capture classifies as a character', () => {
    const positions = [
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => `Key${c}`),
      ...'0123456789'.split('').map(d => `Digit${d}`),
      ...'0123456789'.split('').map(d => `Numpad${d}`),
      ...PUNCTUATION_POSITIONS,
      ...NUMPAD_SYMBOL_POSITIONS,
      ...SEPARATOR_KEY_POSITIONS,
    ];
    for (const code of positions) {
      for (const shift of [false, true]) {
        expect(classifyKey(stroke(code, { shift }))).toBe('char');
        expect(key(code, { shift }).kind).toBe('char');
      }
    }
    for (const code of CONTROL_POSITIONS) {
      expect(classifyKey(stroke(code, { ctrl: true }))).toBe('char');
      expect(key(code, { ctrl: true }).kind).toBe('char');
    }
  });
});
