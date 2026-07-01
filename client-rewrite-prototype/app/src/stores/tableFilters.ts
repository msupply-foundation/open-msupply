import { create } from 'zustand';
import type { ColumnFiltersState } from '@tanstack/react-table';

/*
 * Filter bridge — the header's FilterBar (app-level chrome) and the data table
 * (deep in a tab) are far apart in the tree, so the header PUBLISHES its filter
 * values here in TanStack's `columnFilters` shape and the table consumes them as
 * controlled filter state. One source of truth: filtering lives in the header,
 * the table just reads it. Same cross-tree pattern as the selection footer.
 */
interface TableFiltersState {
  filters: ColumnFiltersState;
  /** Set (or clear, when empty) the filter for one column id. */
  set: (id: string, value: unknown) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const isEmpty = (value: unknown) =>
  value == null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

export const useTableFilters = create<TableFiltersState>(set => ({
  filters: [],
  set: (id, value) =>
    set(state => {
      const rest = state.filters.filter(f => f.id !== id);
      return { filters: isEmpty(value) ? rest : [...rest, { id, value }] };
    }),
  remove: id => set(state => ({ filters: state.filters.filter(f => f.id !== id) })),
  clear: () => set({ filters: [] }),
}));
