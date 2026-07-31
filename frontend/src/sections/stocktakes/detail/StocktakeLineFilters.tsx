import { type Component } from 'solid-js';
import { t } from '@/intl';
import { FilterBar, type Filter } from '@/ui/elements/selectors/FilterBar';
import { Badge } from '@/ui/elements/feedback/Badge';
import { stocktakeDetailFilters } from './stocktakeDetailFilters';
import type { StocktakeLineFilter } from './stocktakeLineFilter';
import type { LocationWithVolume } from '@/domain/location';

// The detail line table's filters, rendered in the DataTable's own toolbar
// (ui-standards → tables › filtering): the item code/name search as the
// screen's default filter, plus an addable Location chip. Which is which lives
// in the definitions (stocktakeDetailFilters).
//
// Plus one SPECIAL chip, the "errors" filter (issue #791 follow-up): it doesn't
// map to a wire filter key the user types into — it's a boolean toggle whose
// offending ids live in the view's transient error state (not the URL). So it
// rides FilterBar's second (`extra`) group, whose value isn't the wire filter:
// present key `showError` = on, absent = off. It's only offered while there are
// stamped errors, and its chip shows the error count as a badge.

// The extra group's value: present-as-null `showError` = the filter is on
// (mirrors the main group's present-key convention). Absent = off.
type ErrorFilterValue = { showError?: null };

export interface StocktakeLineFiltersProps {
  filter: StocktakeLineFilter;
  onFilterChange: (filter: StocktakeLineFilter) => void;
  /**
   * The store's locations (fetched by the view, shared with the editor
   * pickers). The location filter chip uses the volume-blind picker, so it
   * reads only the code/name.
   */
  locations: LocationWithVolume[];
  /** Whether the "show error lines" filter is on (the URL `showError` flag). */
  showError: boolean;
  /** How many lines are currently flagged with an error (drives the badge and
   *  whether the errors chip is offered at all). */
  errorCount: number;
  /** Toggle the errors filter on/off. */
  onShowErrorChange: (showError: boolean) => void;
}

export const StocktakeLineFilters: Component<
  StocktakeLineFiltersProps
> = props => {
  // Build the wire-filter definitions ONCE (a Solid component body runs once at
  // mount). The location chip's render reads `props.locations` through this
  // accessor, so the live list flows in without rebuilding the array on every
  // location refetch.
  const filters = stocktakeDetailFilters(() => props.locations);

  // The errors chip definition. Its render is display-only (a count badge) —
  // there's nothing to type — and removing the chip clears the flag. Built once
  // like the wire filters; the badge count reads props live in JSX.
  const errorFilter: Filter<ErrorFilterValue> = {
    key: 'showError',
    label: () => t('label.errors'),
    render: () => (
      <Badge
        tone="error"
        label={String(props.errorCount)}
        title={t('label.error-line-count', { count: props.errorCount })}
      />
    ),
  };

  return (
    <FilterBar
      filters={filters}
      filter={props.filter}
      onChange={props.onFilterChange}
      extra={{
        // Offer the chip only while errors exist; once cleared it drops out of
        // the add menu and (via the empty filters list) can't stay active.
        filters: props.errorCount > 0 ? [errorFilter] : [],
        // Present key ⇒ on. Kept in sync with the URL flag by the view.
        filter: props.showError ? { showError: null } : {},
        onChange: next => props.onShowErrorChange('showError' in next),
      }}
    />
  );
};
