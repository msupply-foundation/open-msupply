import { describe, expect, it } from 'vitest';
import { pluralCategory } from './plural';

describe('pluralCategory', () => {
  it('selects English categories', () => {
    expect(pluralCategory('en', 1)).toBe('one');
    expect(pluralCategory('en', 0)).toBe('other');
    expect(pluralCategory('en', 5)).toBe('other');
  });

  it('selects French categories (0 and 1 are "one")', () => {
    expect(pluralCategory('fr', 0)).toBe('one');
    expect(pluralCategory('fr', 1)).toBe('one');
    expect(pluralCategory('fr', 2)).toBe('other');
  });

  it('selects Russian categories (one/few/many)', () => {
    expect(pluralCategory('ru', 1)).toBe('one');
    expect(pluralCategory('ru', 3)).toBe('few');
    expect(pluralCategory('ru', 5)).toBe('many');
  });

  it('selects categories for the languages formatted through another tag', () => {
    // Dari and Pashto format through fa-AF and Tetum through en-US
    // (LOCALE_META numberLocale); plural selection must follow the language
    // part of that tag, not the region.
    expect(pluralCategory('prs', 1)).toBe('one');
    expect(pluralCategory('ps', 5)).toBe('other');
    expect(pluralCategory('tet', 1)).toBe('one');
    expect(pluralCategory('tet', 2)).toBe('other');
  });

  it('selects Arabic categories across the full range', () => {
    expect(pluralCategory('ar', 0)).toBe('zero');
    expect(pluralCategory('ar', 1)).toBe('one');
    expect(pluralCategory('ar', 2)).toBe('two');
    expect(pluralCategory('ar', 3)).toBe('few');
    expect(pluralCategory('ar', 11)).toBe('many');
    expect(pluralCategory('ar', 100)).toBe('other');
  });
});
