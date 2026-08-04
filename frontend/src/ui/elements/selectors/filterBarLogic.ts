import type { Filter } from './FilterBar';

/*
 * FilterBar's chip rules — one per function, derived from (definitions, the
 * caller's filter object); nothing is stored here, the filter object IS the
 * state. Pure and outside the component so the rules are testable without a
 * DOM (as numberFieldLogic is for NumberField); groupOps is the only caller.
 */

/**
 * Is this filter's chip on the bar?
 *
 * The filter object IS the presentation state: a chip shows iff its key is
 * PRESENT (present-as-null = added but empty). That holds for EVERY filter,
 * default or not — a screen's default filters are keys its default state seeds
 * (#563), so they are on the bar from the start and come off like any other.
 */
export const isFilterActive = <G extends object>(
  f: Filter<G>,
  filter: G
): boolean => f.key in filter;

/** The chips on the bar, in definition (display) order. */
export const activeFilters = <G extends object>(
  filters: Filter<G>[],
  filter: G
): Filter<G>[] => filters.filter(f => isFilterActive(f, filter));

/**
 * What the add-filter menu can still offer — whatever is not already a chip.
 * A removed default filter is therefore offered back, like any other.
 */
export const availableFilters = <G extends object>(
  filters: Filter<G>[],
  filter: G
): Filter<G>[] => filters.filter(f => !isFilterActive(f, filter));

/**
 * Should the bar offer "Clear all"?
 *
 * Whenever a chip is on the bar — and it then takes EVERY chip off, a default
 * filter's included (#563): a default is a filter the screen starts with, not
 * one the user is stuck with, so nothing on the bar is exempt from the one
 * control that clears it.
 */
export const showsClearAll = <G extends object>(
  filters: Filter<G>[],
  filter: G
): boolean => activeFilters(filters, filter).length > 0;
