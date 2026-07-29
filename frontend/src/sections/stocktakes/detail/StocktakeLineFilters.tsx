import { type Component } from 'solid-js';
import { FilterBar } from '@/ui/elements/selectors/FilterBar';
import { stocktakeDetailFilters } from './stocktakeDetailFilters';
import type { StocktakeLineFilter } from './stocktakeLineFilter';
import type { LocationWithVolume } from '@/domain/location';

// The detail line table's filters, rendered in the DataTable's own toolbar
// (ui-standards → tables › filtering): the addable filter chips — the item
// name/code search and the location picker (no separate always-on search
// field; the search is one of the chips, matching the list).

export interface StocktakeLineFiltersProps {
  filter: StocktakeLineFilter;
  onFilterChange: (filter: StocktakeLineFilter) => void;
  /**
   * The store's locations (fetched by the view, shared with the editor
   * pickers). The location filter chip uses the volume-blind picker, so it
   * reads only the code/name.
   */
  locations: LocationWithVolume[];
}

export const StocktakeLineFilters: Component<
  StocktakeLineFiltersProps
> = props => {
  // Build the filter definitions ONCE (a Solid component body runs once at
  // mount). The location chip's render reads `props.locations` through this
  // accessor, so the live list flows in without rebuilding the array on every
  // location refetch.
  const filters = stocktakeDetailFilters(() => props.locations);

  return (
    <FilterBar
      filters={filters}
      filter={props.filter}
      onChange={props.onFilterChange}
    />
  );
};
