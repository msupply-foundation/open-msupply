import { describe, expect, it } from 'vitest';
import {
  compareScans,
  hasInvisibleCharacters,
  separatorCount,
  toHex,
  visualiseRaw,
} from './scanDiagnostics';

const GS = String.fromCharCode(29);

// The registry keys on the code exactly, so a diagnostic screen that hides a
// character is worse than no screen at all.
describe('making every character visible', () => {
  it('shows the GS1 field separator, which is otherwise invisible', () => {
    expect(visualiseRaw(`01${GS}10`)).toBe('01␝10');
  });

  it('shows a stray space', () => {
    expect(visualiseRaw('AB CD')).toBe('AB␣CD');
  });

  it('shows a trailing carriage return the scanner appended', () => {
    expect(visualiseRaw('0123\r')).toBe('0123␍');
  });

  it('leaves ordinary characters alone', () => {
    expect(visualiseRaw('0123-AB/c')).toBe('0123-AB/c');
  });

  it('flags a scan that carries something invisible', () => {
    expect(hasInvisibleCharacters(`01${GS}10`)).toBe(true);
    expect(hasInvisibleCharacters('0123 ')).toBe(true);
    expect(hasInvisibleCharacters('0123')).toBe(false);
  });

  it('counts field separators, so a structured label is recognisable', () => {
    expect(separatorCount(`01${GS}10${GS}17`)).toBe(2);
    expect(separatorCount('0123')).toBe(0);
  });
});

// The cross-mode check: one label read in report mode and again in wedge mode
// must give identical characters, or the same physical label is learned twice.
describe('comparing two reads of the same label', () => {
  it('reports identical reads as equal', () => {
    expect(compareScans(`01${GS}AB-1`, `01${GS}AB-1`)).toEqual({ equal: true });
  });

  it('pinpoints a case difference — the reference wedge uppercases everything', () => {
    expect(compareScans('ab12', 'Ab12')).toEqual({
      equal: false,
      position: 1,
      reference: 'a',
      actual: 'A',
    });
  });

  it('pinpoints a dropped punctuation character', () => {
    // The reference wedge deletes the hyphen; the codes then differ at it.
    expect(compareScans('AB-12', 'AB12')).toMatchObject({
      equal: false,
      position: 3,
      reference: '-',
      actual: '1',
    });
  });

  it('reports a read that simply ran short', () => {
    expect(compareScans('ABCD', 'ABC')).toEqual({
      equal: false,
      position: 4,
      reference: 'D',
      actual: undefined,
    });
  });

  it('reports a lost separator', () => {
    expect(compareScans(`01${GS}10`, '0110')).toMatchObject({
      equal: false,
      position: 3,
    });
  });
});

describe('the raw readout', () => {
  it('renders every byte as two hex digits', () => {
    expect(toHex([0x00, 0x1d, 0xff, 0x0a])).toBe('00 1d ff 0a');
  });
});
