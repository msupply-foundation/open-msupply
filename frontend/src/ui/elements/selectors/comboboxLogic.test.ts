import { describe, expect, it } from 'vitest';
import { typedQuery, visibleOptions } from './comboboxLogic';

// A location-picker-shaped list: the case the cap exists for (a whole-store
// location list, ~5,000 rows on the tablet that prompted it).
const locations = Array.from({ length: 500 }, (_, i) => ({
  id: `loc-${i}`,
  code: `A${String(i).padStart(3, '0')}`,
}));

const codeContains = (text: string) => (l: { code: string }) =>
  l.code.includes(text);
const all = () => true;

describe('visibleOptions', () => {
  it('mounts at most the cap, and reports the full match count', () => {
    const { items, total } = visibleOptions(locations, all, 100);
    expect(items).toHaveLength(100);
    expect(total).toBe(500);
    // In caller order, from the top — not a sample.
    expect(items[0]?.code).toBe('A000');
    expect(items[99]?.code).toBe('A099');
  });

  it('filters BEFORE capping, so a search reaches an option past the cap', () => {
    // The regression that matters: A499 is the 500th row, five times past the
    // cap. Capping first would leave it unreachable no matter what was typed.
    const { items, total } = visibleOptions(
      locations,
      codeContains('A499'),
      100
    );
    expect(items.map(l => l.code)).toEqual(['A499']);
    expect(total).toBe(1);
  });

  it('reports total above the cap so the caller can say how many are withheld', () => {
    // 'A1' matches A1xx — 100 of them — plus nothing else at this size.
    const { items, total } = visibleOptions(locations, codeContains('A1'), 20);
    expect(items).toHaveLength(20);
    expect(total).toBe(100);
    // The figure the truncation notice reports.
    expect(total - items.length).toBe(80);
  });

  it('leaves a list shorter than the cap untouched', () => {
    const { items, total } = visibleOptions(locations.slice(0, 7), all, 100);
    expect(items).toHaveLength(7);
    expect(total).toBe(7);
  });

  it('distinguishes nothing-matched from nothing-shown', () => {
    // total === 0 is the combobox's "no matches" state; a capped list with
    // matches must never look like it.
    expect(visibleOptions(locations, codeContains('ZZZ'), 100).total).toBe(0);
    expect(visibleOptions([], all, 100)).toEqual({ items: [], total: 0 });
  });

  it('mounts everything at an infinite cap (the pre-cap behaviour)', () => {
    const { items, total } = visibleOptions(locations, all, Infinity);
    expect(items).toHaveLength(500);
    expect(total).toBe(500);
  });

  it('mounts nothing at a zero cap but still counts the matches', () => {
    const { items, total } = visibleOptions(locations, all, 0);
    expect(items).toEqual([]);
    expect(total).toBe(500);
  });
});

// The rule the whole reopen behaviour hangs on (#985): the input holds a query
// while the user is typing and the selection's label once one is committed, and
// only the first is a search.
describe('typedQuery', () => {
  const item = { id: 'i1', code: 'ABC', name: 'Amoxicillin' };
  const label = (i: { code: string; name: string }) => `${i.code} - ${i.name}`;

  it('is the typed text while nothing is selected', () => {
    expect(typedQuery('amox', null, label)).toBe('amox');
    expect(typedQuery('amox', undefined, label)).toBe('amox');
    expect(typedQuery('', null, label)).toBe('');
  });

  it('is the typed text while a selection is being searched past', () => {
    // The committed item is ABC - Amoxicillin; the user is typing at something
    // else. Nothing here may be mistaken for a label echo.
    expect(typedQuery('para', item, label)).toBe('para');
    expect(typedQuery('ABC', item, label)).toBe('ABC');
    expect(typedQuery('ABC - Amoxicillin ', item, label)).toBe(
      'ABC - Amoxicillin '
    );
  });

  it('is empty when the text IS the committed selection label', () => {
    // Kobalte's resync writes exactly this back into the input whenever the
    // selection (re)emits — searching for it finds the item at best and, on a
    // server-backed lookup whose source can't match a composed label, nothing
    // at all. It is not a search.
    expect(typedQuery('ABC - Amoxicillin', item, label)).toBe('');
  });
});
