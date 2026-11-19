import { describe, expect, it } from 'vitest';
import {
  firstMatchKey,
  nextHighlightKey,
  skipsHighlight,
  PINNED_SECTION,
  type OptionNode,
  sectionOptions,
  typedQuery,
  visibleOptions,
} from './comboboxLogic';

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

describe('sectionOptions — grouped mode', () => {
  type Opt = { value: string; group?: string };
  const opt = (value: string, group?: string): Opt => ({ value, group });
  const sections = (items: Opt[]) => sectionOptions(items, i => i.group);

  it('puts the ungrouped items in one empty-headed section, first', () => {
    const result = sections([
      opt('none'),
      opt('routine'),
      opt('c1', 'Campaign'),
    ]);
    expect(result.map(s => s.label)).toEqual([PINNED_SECTION, 'Campaign']);
    expect(result[0]?.options.map(o => o.value)).toEqual(['none', 'routine']);
  });

  it('never emits a bare option — Kobalte reads every node as a section', () => {
    const result = sections([opt('none'), opt('c1', 'Campaign')]);
    expect(result.every(s => Array.isArray(s.options))).toBe(true);
  });

  it('buckets groups in first-seen order, not alphabetically', () => {
    const result = sections([opt('z', 'Zebra'), opt('a', 'Ant')]);
    expect(result.map(s => s.label)).toEqual(['Zebra', 'Ant']);
  });

  it('drops the pinned section when nothing is ungrouped', () => {
    const result = sections([opt('c1', 'Campaign')]);
    expect(result.map(s => s.label)).toEqual(['Campaign']);
  });

  it('drops a group whose items were all filtered away, heading and all', () => {
    // The caller filters before sectioning, so an emptied group simply never
    // reaches here — and must not leave a heading over nothing.
    const result = sections([opt('none')]);
    expect(result.map(s => s.label)).toEqual([PINNED_SECTION]);
  });

  it('returns nothing at all for no items', () => {
    expect(sections([])).toEqual([]);
  });
});

describe('firstMatchKey', () => {
  const item = (key: string, disabled = false): OptionNode<string> => ({
    type: 'item',
    key,
    rawValue: key,
    disabled,
  });
  const section = (key: string): OptionNode<string> => ({
    type: 'section',
    key,
    rawValue: key,
    disabled: false,
  });

  it('picks the first option', () => {
    expect(firstMatchKey([item('a'), item('b')])).toBe('a');
  });

  it('passes over section headings and disabled options', () => {
    expect(
      firstMatchKey([section('Group'), item('on-hold', true), item('ok')])
    ).toBe('ok');
  });

  it('passes over skipped options — grouped mode pins', () => {
    const pinned = new Set(['none']);
    expect(
      firstMatchKey([item('none'), item('match')], key => pinned.has(key))
    ).toBe('match');
  });

  it('highlights nothing when no option qualifies', () => {
    expect(firstMatchKey([item('x', true)])).toBeUndefined();
    expect(firstMatchKey([])).toBeUndefined();
  });
});

describe('skipsHighlight', () => {
  it('keeps an ordinary row', () => {
    expect(
      skipsHighlight({ held: false, pinned: false, matchesQuery: true })
    ).toBe(false);
  });

  it('keeps the held selection while it matches the query', () => {
    // Skipping it would make Enter swap it for the next match.
    expect(
      skipsHighlight({ held: true, pinned: false, matchesQuery: true })
    ).toBe(false);
  });

  it('skips the held selection when it is listed without matching', () => {
    expect(
      skipsHighlight({ held: true, pinned: false, matchesQuery: false })
    ).toBe(true);
  });

  it('skips a pinned item the query does not name, keeps one it does', () => {
    expect(
      skipsHighlight({ held: false, pinned: true, matchesQuery: false })
    ).toBe(true);
    expect(
      skipsHighlight({ held: false, pinned: true, matchesQuery: true })
    ).toBe(false);
  });
});

describe('nextHighlightKey', () => {
  const item = (key: string): OptionNode<string> => ({
    type: 'item',
    key,
    rawValue: key,
    disabled: false,
  });
  // A Kobalte-collection-shaped list: iterable, with lookup by key.
  const list = (...keys: string[]) => {
    const nodes = keys.map(item);
    return Object.assign(nodes, {
      getItem: (key: string) => nodes.find(n => n.key === key),
    });
  };
  const held = new Set(['held']);
  const skip = (key: string) => held.has(key);

  it('highlights the first match when nothing is highlighted', () => {
    expect(
      nextHighlightKey({
        query: 'a',
        queryChanged: true,
        nodes: list('a1', 'a2'),
        focused: undefined,
      })
    ).toBe('a1');
  });

  it('moves nothing while there is no query', () => {
    expect(
      nextHighlightKey({
        query: ' ',
        queryChanged: true,
        nodes: list('a1'),
        focused: undefined,
      })
    ).toBeUndefined();
  });

  it('keeps a row the user arrowed to while the results refresh', () => {
    expect(
      nextHighlightKey({
        query: 'a',
        queryChanged: false,
        nodes: list('a1', 'a2'),
        focused: 'a2',
      })
    ).toBeUndefined();
  });

  it('moves to the first match when the highlighted row drops out', () => {
    expect(
      nextHighlightKey({
        query: 'ab',
        queryChanged: true,
        nodes: list('ab1', 'ab2'),
        focused: 'a2',
      })
    ).toBe('ab1');
  });

  it('moves off a skipped row when the query changes', () => {
    // Reopened on the held item, then typed over: it is still listed (the
    // seed), but no longer an answer.
    expect(
      nextHighlightKey({
        query: 'o',
        queryChanged: true,
        nodes: list('held', 'o1'),
        focused: 'held',
        skip,
      })
    ).toBe('o1');
  });

  it('leaves a skipped row the user arrowed onto', () => {
    expect(
      nextHighlightKey({
        query: 'o',
        queryChanged: false,
        nodes: list('held', 'o1'),
        focused: 'held',
        skip,
      })
    ).toBeUndefined();
  });

  it('reports no move when the first match is already highlighted', () => {
    expect(
      nextHighlightKey({
        query: 'a',
        queryChanged: true,
        nodes: list('a1'),
        focused: 'a1',
      })
    ).toBeUndefined();
  });
});
