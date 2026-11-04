import { describe, expect, it } from 'vitest';
import { createRoot, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { SortState } from '@/ui/elements/table/columnTypes';
import { createSortedOnDemand } from './createSortedOnDemand';

// The on-demand sort over an editable store-backed line set (issue #1742):
// an in-place edit never re-orders, choosing a sort or a new line set does,
// and the rows handed back are the live store items.

type Row = { id: string; qty: number };
type Key = 'id' | 'qty';
const value = (row: Row, key: Key) => row[key];

const setup = () => {
  const [store, setStore] = createStore<{ lines: Row[] }>({
    lines: [
      { id: 'a', qty: 2 },
      { id: 'b', qty: 3 },
      { id: 'c', qty: 1 },
    ],
  });
  const [sort, setSort] = createSignal<SortState<Key>>({
    key: 'qty',
    desc: false,
  });
  const sorted = createSortedOnDemand(() => store.lines, sort, value);
  const ids = () => sorted().map(r => r.id);
  return { store, setStore, setSort, sorted, ids };
};

describe('createSortedOnDemand', () => {
  it('orders by the current sort', () => {
    createRoot(dispose => {
      const { ids } = setup();
      expect(ids()).toEqual(['c', 'a', 'b']);
      dispose();
    });
  });

  it('keeps the order while the sorted field is edited in place', () => {
    createRoot(dispose => {
      const { setStore, sorted, ids } = setup();
      const before = sorted();
      setStore('lines', r => r.id === 'c', 'qty', 9);
      setStore('lines', r => r.id === 'c', 'qty', 99);
      expect(sorted()).toBe(before);
      expect(ids()).toEqual(['c', 'a', 'b']);
      // The rows are the live store items, so the edit still shows.
      expect(sorted()[0].qty).toBe(99);
      dispose();
    });
  });

  it('re-sorts on the current values when the sort is chosen again', () => {
    createRoot(dispose => {
      const { setStore, setSort, ids } = setup();
      setStore('lines', r => r.id === 'c', 'qty', 99);
      setSort({ key: 'qty', desc: false });
      expect(ids()).toEqual(['a', 'b', 'c']);
      setSort({ key: 'qty', desc: true });
      expect(ids()).toEqual(['c', 'b', 'a']);
      dispose();
    });
  });

  it('re-sorts when a new line set replaces the old one', () => {
    createRoot(dispose => {
      const { setStore, ids } = setup();
      setStore('lines', [
        { id: 'x', qty: 5 },
        { id: 'y', qty: 4 },
      ]);
      expect(ids()).toEqual(['y', 'x']);
      dispose();
    });
  });
});
