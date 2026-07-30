import { type Component } from 'solid-js';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { type Location } from '../../../domain/location';
import { outboundDetailFilters } from './outboundDetailFilters';
import type { OutboundLineFilter } from './outboundLineFilter';

// The detail line table's filters, rendered in the DataTable's own toolbar
// (ui-standards → tables › filtering): the item code/name search as the
// screen's default filter, plus an addable Location chip. Which is which lives
// in the definitions (outboundDetailFilters).

export interface OutboundLineFiltersProps {
  filter: OutboundLineFilter;
  onFilterChange: (filter: OutboundLineFilter) => void;
  /**
   * The store's locations (fetched by the view). The location chip uses the
   * volume-blind picker, so it reads only the code/name.
   */
  locations: Location[];
}

export const OutboundLineFilters: Component<
  OutboundLineFiltersProps
> = props => {
  // Build the filter definitions ONCE (a Solid component body runs once at
  // mount). The location chip's render reads `props.locations` through this
  // accessor, so the live list flows in without rebuilding the array on every
  // location refetch.
  const filters = outboundDetailFilters(() => props.locations);

  return (
    <FilterBar
      filters={filters}
      filter={props.filter}
      onChange={props.onFilterChange}
    />
  );
};
