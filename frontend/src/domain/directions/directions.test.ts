import { describe, expect, it } from 'vitest';
import { expandAbbreviations } from './index';

const ABBREVIATIONS = [
  { text: '2t', expansion: 'Take TWO tablets' },
  { text: 'tds', expansion: 'THREE times a day' },
  { text: 'cc', expansion: 'with/after food' },
];

describe('expandAbbreviations (AC-R1 — tokens expand, case-insensitively)', () => {
  it('replaces each matching token with its expansion', () => {
    expect(expandAbbreviations('2t tds', ABBREVIATIONS)).toBe(
      'Take TWO tablets THREE times a day'
    );
  });

  it('matches case-insensitively and passes unknown tokens through', () => {
    expect(expandAbbreviations('2T daily CC', ABBREVIATIONS)).toBe(
      'Take TWO tablets daily with/after food'
    );
  });

  it('collapses stray whitespace and leaves plain text untouched', () => {
    expect(expandAbbreviations('  take   with water ', ABBREVIATIONS)).toBe(
      'take with water'
    );
    expect(expandAbbreviations('', ABBREVIATIONS)).toBe('');
  });
});

describe('expandAbbreviations (AC-R2 — item default directions expand the same way)', () => {
  it('expands abbreviation tokens inside a chosen default direction', () => {
    expect(expandAbbreviations('2t cc', ABBREVIATIONS)).toBe(
      'Take TWO tablets with/after food'
    );
  });
});
