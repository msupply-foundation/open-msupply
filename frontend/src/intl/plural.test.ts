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

  it('selects Arabic categories across the full range', () => {
    expect(pluralCategory('ar', 0)).toBe('zero');
    expect(pluralCategory('ar', 1)).toBe('one');
    expect(pluralCategory('ar', 2)).toBe('two');
    expect(pluralCategory('ar', 3)).toBe('few');
    expect(pluralCategory('ar', 11)).toBe('many');
    expect(pluralCategory('ar', 100)).toBe('other');
  });
});
