import { describe, expect, it } from 'vitest';
import { createMemo, createRoot, createSignal } from 'solid-js';
import { equipmentFilters, type FilterOption } from './listFilters';

// FilterBar renders its chips with
//   <For each={activeFilters(props.filters, props.filter)}>
// and `activeFilters` is a plain `.filter()`, so it PRESERVES each definition's
// object identity. <For> is keyed by that identity — which makes the stability
// of the array a real, user-visible contract rather than an optimisation:
// hand it new objects and every chip remounts, destroying the input the user is
// typing into (kdd/solid-reactivity-pitfalls § no remounts on interaction).
//
// These are the guards for that contract, at the two places it can break.

const CATEGORIES: FilterOption[] = [{ id: 'cat-1', name: 'Refrigerators' }];
const TYPES: FilterOption[] = [{ id: 'type-1', name: 'Freezer' }];

describe('the filter definitions are stable across an edit', () => {
  it('keeps array AND item identity when an unrelated signal changes', () => {
    createRoot(dispose => {
      // Stands in for the list's own filter value, which changes on every
      // keystroke in a text chip.
      const [filterValue, setFilterValue] = createSignal('');
      const filters = createMemo(() =>
        equipmentFilters({
          categories: () => CATEGORIES,
          types: () => TYPES,
          showStore: () => false,
        })
      );

      const first = filters();
      setFilterValue('R');
      setFilterValue('RS');
      const afterTyping = filters();

      expect(afterTyping).toBe(first);
      expect(afterTyping.every((f, i) => f === first[i])).toBe(true);
      // Read so the signal is genuinely used.
      expect(filterValue()).toBe('RS');
      dispose();
    });
  });

  it('does not rebuild when the catalogue options arrive', () => {
    // Categories and types load AFTER the array is built; read as accessors
    // inside each chip's render, they must not rebuild it when they populate.
    createRoot(dispose => {
      const [categories, setCategories] = createSignal<FilterOption[]>([]);
      const [types, setTypes] = createSignal<FilterOption[]>([]);
      const filters = createMemo(() =>
        equipmentFilters({ categories, types, showStore: () => false })
      );

      const first = filters();
      setCategories(CATEGORIES);
      setTypes(TYPES);

      expect(filters()).toBe(first);
      dispose();
    });
  });

  it('DOES rebuild when the store filter appears — the one thing that may', () => {
    // `showStore` decides whether the key is in the map at all, so it is read
    // at build time. It can flip once, when server info resolves.
    createRoot(dispose => {
      const [showStore, setShowStore] = createSignal(false);
      const filters = createMemo(() =>
        equipmentFilters({
          categories: () => CATEGORIES,
          types: () => TYPES,
          showStore,
        })
      );

      const keys = () => filters().map(f => f.key);
      expect(keys()).not.toContain('storeCodeOrName');
      setShowStore(true);
      expect(keys()).toContain('storeCodeOrName');
      dispose();
    });
  });
});

describe('the filter set the list offers', () => {
  const build = () =>
    equipmentFilters({
      categories: () => CATEGORIES,
      types: () => TYPES,
      showStore: () => false,
    });

  it('offers every filter the surface names, and nothing else', () => {
    expect(build().map(f => f.key).sort()).toEqual(
      [
        'assetNumber',
        'categoryId',
        'functionalStatus',
        'installationDate',
        'isNonCatalogue',
        'notes',
        'replacementDate',
        'serialNumber',
        'typeId',
      ].sort()
    );
  });

  it('dismisses the catalogue-item filter — no control on the screen sets one', () => {
    expect(build().map(f => f.key)).not.toContain('catalogueItemId');
  });
});
