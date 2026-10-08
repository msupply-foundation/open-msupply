import { describe, expect, it } from 'vitest';
import {
  MEASURE_WIDE_REM,
  cardFieldMaxRem,
  cardFlex,
  cardTrack,
  cardTracksMaxRem,
  cardTracksMinRem,
} from './cardWidths';

/*
 * The card field-width arithmetic (CardView reads meta.cardWidth / cardSpan and
 * feeds the values here). The model: ranges by content type per ui-standards
 * § Field Widths by Context › By Content Type — a tight min–max for a scalar,
 * 12.5–36 for a lookup, and free text declaring a floor but NO ceiling, which
 * also removes its group's own ceiling; every group is then held to the 80rem
 * measure. See src/ui/docs/CARD_TABLE_MODEL.md § Field widths.
 */

const quantity = { min: 7.5, max: 9, weight: 1 }; // scalar: tight range
const lookup = { min: 12.5, max: 36, weight: 2 }; // lookup: unpredictable length
const note = { min: 12.5, weight: 3 }; // free text: no ceiling

describe('cardTrack', () => {
  it('pins a bare number to a fixed rem track', () => {
    expect(cardTrack(8.75)).toBe('8.75rem');
  });

  it('gives a range a minmax track: floor in rem, weight as its fr share', () => {
    expect(cardTrack(lookup)).toBe('minmax(12.5rem, 2fr)');
    expect(cardTrack(note)).toBe('minmax(12.5rem, 3fr)');
  });

  it('falls an undeclared column back to a 1fr share off a readable floor', () => {
    expect(cardTrack(undefined)).toBe('minmax(10rem, 1fr)');
  });
});

describe('cardFlex (the wrapping narrow fallback, per field)', () => {
  it('declares nothing for an unsized, unspanned field', () => {
    expect(cardFlex(undefined, undefined)).toBeUndefined();
  });

  it('carries the span alone when only a span is declared', () => {
    expect(cardFlex(undefined, 3)).toEqual({ '--card-field-span': '3' });
  });

  it('pins a bare number to its floor at weight 0', () => {
    expect(cardFlex(10, undefined)).toEqual({
      '--card-field-weight': '0',
      '--card-field-floor': '10rem',
    });
  });

  it('gives a capped range its weight, floor and per-field ceiling', () => {
    expect(cardFlex(lookup, 2)).toEqual({
      '--card-field-weight': '2',
      '--card-field-floor': '12.5rem',
      '--card-field-max-w': '36rem',
      '--card-field-span': '2',
    });
  });

  it('leaves free text without a ceiling: no max-w property at all', () => {
    const style = cardFlex(note, undefined);
    expect(style).toEqual({
      '--card-field-weight': '3',
      '--card-field-floor': '12.5rem',
    });
    expect(style).not.toHaveProperty('--card-field-max-w');
  });
});

describe('cardTracksMinRem (the narrow-fallback threshold)', () => {
  it('sums the floors plus a 1rem gap between each pair', () => {
    // 7.5 + 12.5 + 10 fixed + two gaps.
    expect(cardTracksMinRem([quantity, lookup, 10])).toBe(32);
  });

  it('counts an undeclared column at the 10rem fallback floor', () => {
    expect(cardTracksMinRem([quantity, undefined])).toBe(18.5);
  });

  it('is 0 for no columns (no negative gap)', () => {
    expect(cardTracksMinRem([])).toBe(0);
  });
});

describe('cardTracksMaxRem (the group ceiling)', () => {
  it('sums the ceilings plus the gaps for a fully capped group', () => {
    // 9 + 36 + 10 fixed + two gaps.
    expect(cardTracksMaxRem([quantity, lookup, 10])).toBe(57);
  });

  it('has no ceiling when any column declares no width', () => {
    expect(cardTracksMaxRem([quantity, undefined])).toBeUndefined();
  });

  it('has no ceiling when any field is uncapped free text', () => {
    expect(cardTracksMaxRem([quantity, lookup, note])).toBeUndefined();
  });
});

describe('cardFieldMaxRem (the ceiling held to the measure)', () => {
  it('keeps a small group at its own ceiling', () => {
    expect(cardFieldMaxRem([quantity, lookup, 10])).toBe(57);
  });

  it('holds an uncapped (free-text) group to the measure', () => {
    expect(cardFieldMaxRem([quantity, note])).toBe(MEASURE_WIDE_REM);
  });

  it('clamps a capped group whose ceilings outrun the measure', () => {
    // Three lookups' ceilings alone are 108rem + gaps.
    expect(cardFieldMaxRem([lookup, lookup, lookup])).toBe(MEASURE_WIDE_REM);
  });
});
