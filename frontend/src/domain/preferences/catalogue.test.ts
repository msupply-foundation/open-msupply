import { describe, expect, it } from 'vitest';
import {
  filterCatalogue,
  groupCatalogue,
  matchesPreferenceFilter,
  type PreferenceGroupDef,
} from './catalogue';

// A synthetic catalogue: the mechanics are the same whichever page's
// preferences flow through (the pages' own tests pin which keys land where).
type Key = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
interface Pref {
  key: Key;
}
const served: Pref[] = (['a', 'b', 'c', 'd', 'e', 'f'] as const).map(key => ({
  key,
}));

const ONE: PreferenceGroupDef<'label.one'> = {
  id: 'one',
  labelKey: 'label.one',
};
const TWO: PreferenceGroupDef<'label.two'> = {
  id: 'two',
  labelKey: 'label.two',
};
const GROUP_OF: Partial<
  Record<Key, PreferenceGroupDef<'label.one' | 'label.two'>>
> = { b: ONE, c: TWO, e: ONE };

const LABELS: Record<Key, string> = {
  a: 'Alpha',
  b: 'Bravo one',
  c: 'Charlie',
  d: 'Delta',
  e: 'Echo one',
  f: 'Foxtrot',
};
const labelOf = (p: Pref) => LABELS[p.key];
const groupLabelOf = (g: { labelKey: string }) =>
  g.labelKey === 'label.one' ? 'Group one' : 'Group two';

describe('groupCatalogue', () => {
  it('groups appear where their first member does; members keep served order', () => {
    const { ungrouped, groups } = groupCatalogue(served, GROUP_OF);
    expect(ungrouped.map(p => p.key)).toEqual(['a', 'd', 'f']);
    expect(groups.map(g => g.id)).toEqual(['one', 'two']);
    expect(groups[0]?.members.map(p => p.key)).toEqual(['b', 'e']);
    expect(groups[0]?.labelKey).toBe('label.one');
  });

  it('omits a group none of whose members are served', () => {
    const { groups } = groupCatalogue([{ key: 'a' }, { key: 'c' }], GROUP_OF);
    expect(groups.map(g => g.id)).toEqual(['two']);
  });
});

describe('matchesPreferenceFilter', () => {
  it('matches case-insensitively on a substring of the label', () => {
    expect(matchesPreferenceFilter('Enable blind stock take', 'STOCK')).toBe(
      true
    );
    expect(matchesPreferenceFilter('Order in packs', 'stock')).toBe(false);
  });

  it('an empty or whitespace-only term matches everything', () => {
    expect(matchesPreferenceFilter('Anything', '')).toBe(true);
    expect(matchesPreferenceFilter('Anything', '   ')).toBe(true);
  });
});

describe('filterCatalogue', () => {
  const grouped = groupCatalogue(served, GROUP_OF);

  it('ungrouped rows match on their own label', () => {
    const filtered = filterCatalogue(grouped, labelOf, groupLabelOf, 'delta');
    expect(filtered.ungrouped.map(p => p.key)).toEqual(['d']);
    expect(filtered.groups).toEqual([]);
  });

  it('a member match keeps the whole group', () => {
    const filtered = filterCatalogue(grouped, labelOf, groupLabelOf, 'echo');
    expect(filtered.ungrouped).toEqual([]);
    expect(filtered.groups.map(g => g.id)).toEqual(['one']);
    expect(filtered.groups[0]?.members.map(p => p.key)).toEqual(['b', 'e']);
  });

  it('a group-label match keeps the group even when no member label matches', () => {
    const filtered = filterCatalogue(
      grouped,
      labelOf,
      groupLabelOf,
      'group two'
    );
    expect(filtered.groups.map(g => g.id)).toEqual(['two']);
  });

  it('no match leaves nothing', () => {
    const none = filterCatalogue(grouped, labelOf, groupLabelOf, 'zzzqqq');
    expect(none.ungrouped).toEqual([]);
    expect(none.groups).toEqual([]);
  });

  it('a blank term hands back the same catalogue; a term keeps surviving identities', () => {
    expect(filterCatalogue(grouped, labelOf, groupLabelOf, '  ')).toBe(grouped);
    const filtered = filterCatalogue(grouped, labelOf, groupLabelOf, 'one');
    expect(filtered.groups[0]).toBe(grouped.groups[0]);
  });
});
