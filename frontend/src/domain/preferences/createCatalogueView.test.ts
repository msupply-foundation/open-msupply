import { describe, expect, it } from 'vitest';
import { createMemo, createRoot, createSignal } from 'solid-js';
import { createCatalogueView } from './createCatalogueView';
import { groupCatalogue, type PreferenceGroupDef } from './catalogue';

/*
 * The reactive half of the catalogue: what the two preference pages read, and
 * the open-group state their accordion runs on. The grouping and filtering
 * mechanics themselves are catalogue.test.ts's; these pin the behaviours the
 * pages were each holding their own copy of — the memo identity a keyed list
 * depends on (kdd/solid-reactivity-pitfalls), and the three-way handover
 * between the user's open groups and a filter holding them open
 * (OMS-REG-GPREF-01.3/.5, OMS-REG-SET-05.61).
 */

type Key = 'a' | 'b' | 'c' | 'd';
interface Pref {
  key: Key;
}

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
> = { b: ONE, c: TWO };

const LABELS: Record<Key, string> = {
  a: 'Alpha',
  b: 'Bravo',
  c: 'Charlie',
  d: 'Delta',
};

const served: Pref[] = (['a', 'b', 'c', 'd'] as const).map(key => ({ key }));

/* The view under one disposable root, with the filter the page owns. Groups
   are labelled "Group one" / "Group two" so a term can match a group's own
   label without matching any member's. */
const harness = (preferences: Pref[] = served) => {
  const [filter, setFilter] = createSignal('');
  let dispose!: () => void;
  const view = createRoot(disposeFn => {
    dispose = disposeFn;
    return createCatalogueView({
      preferences: () => preferences,
      group: prefs => groupCatalogue(prefs, GROUP_OF),
      labelOf: pref => LABELS[pref.key],
      groupLabelOf: group =>
        group.labelKey === 'label.one' ? 'Group one' : 'Group two',
      filter,
    });
  });
  return { ...view, filter, setFilter, dispose };
};

describe('createCatalogueView — the catalogue as shown', () => {
  it('splits the served order into ungrouped rows and groups', () => {
    const { catalogue, dispose } = harness();
    expect(catalogue().ungrouped.map(p => p.key)).toEqual(['a', 'd']);
    expect(catalogue().groups.map(g => g.id)).toEqual(['one', 'two']);
    dispose();
  });

  it('filters ungrouped rows on their own label, keeping a matched group whole', () => {
    const { catalogue, setFilter, dispose } = harness();
    setFilter('alpha');
    expect(catalogue().ungrouped.map(p => p.key)).toEqual(['a']);
    expect(catalogue().groups).toEqual([]);

    // A group's own label matches even though no member's does.
    setFilter('group two');
    expect(catalogue().ungrouped).toEqual([]);
    expect(catalogue().groups.map(g => g.id)).toEqual(['two']);
    dispose();
  });

  it('reports nothing visible only when the filter leaves no row and no group', () => {
    const { nothingVisible, setFilter, dispose } = harness();
    expect(nothingVisible()).toBe(false);
    setFilter('alpha');
    expect(nothingVisible()).toBe(false);
    setFilter('zzzqqq');
    expect(nothingVisible()).toBe(true);
    // Clearing brings the whole catalogue back.
    setFilter('');
    expect(nothingVisible()).toBe(false);
    dispose();
  });

  it('an empty catalogue is nothing visible with no filter typed', () => {
    const { nothingVisible, catalogue, dispose } = harness([]);
    expect(catalogue().ungrouped).toEqual([]);
    expect(nothingVisible()).toBe(true);
    dispose();
  });

  it('keeps group identity across a keystroke, so a keyed list never remounts an item', () => {
    // The reason both memos exist: <For> keyed by reference tears down and
    // rebuilds an accordion item whose object changed, losing its open state
    // mid-typing (kdd/solid-reactivity-pitfalls).
    const { catalogue, setFilter, dispose } = harness();
    const whole = catalogue();
    const before = whole.groups[0];
    setFilter('o'); // matches "Group one"/"Group two" — both groups survive
    expect(catalogue().groups[0]).toBe(before);
    // ...and a term that is blank once trimmed hands back the very same
    // catalogue object, not a rebuilt copy of it.
    setFilter('   ');
    expect(catalogue()).toBe(whole);
    dispose();
  });
});

describe('createCatalogueView — which groups are open', () => {
  it('starts closed and remembers what the user opened', () => {
    const { accordionProps, dispose } = harness();
    expect(accordionProps.value).toEqual([]);
    accordionProps.onValueChange(['two']);
    expect(accordionProps.value).toEqual(['two']);
    accordionProps.onValueChange([]);
    expect(accordionProps.value).toEqual([]);
    dispose();
  });

  it('holds every kept group open while a filter is active', () => {
    const { accordionProps, setFilter, dispose } = harness();
    setFilter('group two');
    expect(accordionProps.value).toEqual(['two']);
    setFilter('o');
    expect(accordionProps.value).toEqual(['one', 'two']);
    dispose();
  });

  it("neither consults nor overwrites the user's choice while filtering", () => {
    const { accordionProps, setFilter, dispose } = harness();
    accordionProps.onValueChange(['one']);

    // Held open regardless of what the user had chosen...
    setFilter('o');
    expect(accordionProps.value).toEqual(['one', 'two']);
    // ...and a collapse attempted under an active filter is ignored, so the
    // rows the filter matched on cannot be hidden by it.
    accordionProps.onValueChange([]);
    expect(accordionProps.value).toEqual(['one', 'two']);

    // Clearing the filter hands the groups straight back to the user's choice,
    // which the filter never touched.
    setFilter('');
    expect(accordionProps.value).toEqual(['one']);
    dispose();
  });

  it('treats a whitespace-only term as no filter at all', () => {
    const { accordionProps, setFilter, dispose } = harness();
    setFilter('   ');
    expect(accordionProps.value).toEqual([]);
    accordionProps.onValueChange(['two']);
    expect(accordionProps.value).toEqual(['two']);
    dispose();
  });

  it('names only the groups that survive the filter, never a hidden one', () => {
    const { accordionProps, setFilter, dispose } = harness();
    setFilter('zzzqqq');
    expect(accordionProps.value).toEqual([]);
    dispose();
  });

  it('tracks as a live read, so spreading it onto the Accordion stays reactive', () => {
    // `value` is a GETTER so `<Accordion multiple {...accordionProps}>` keeps
    // its reactivity through mergeProps. A snapshot taken once at
    // construction would read correctly here and then never update again —
    // the groups would freeze on whatever was open when the panel mounted.
    // A memo distinguishes the two: it only recomputes if the read it made
    // registered as a dependency.
    const [filter, setFilter] = createSignal('');
    let dispose!: () => void;
    const seen = createRoot(disposeFn => {
      dispose = disposeFn;
      const { accordionProps } = createCatalogueView({
        preferences: () => served,
        group: prefs => groupCatalogue(prefs, GROUP_OF),
        labelOf: pref => LABELS[pref.key],
        groupLabelOf: group =>
          group.labelKey === 'label.one' ? 'Group one' : 'Group two',
        filter,
      });
      return createMemo(() => accordionProps.value);
    });

    expect(seen()).toEqual([]);
    setFilter('o');
    expect(seen()).toEqual(['one', 'two']);
    setFilter('');
    expect(seen()).toEqual([]);
    dispose();
  });
});
