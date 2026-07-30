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
 * PRESENT (present-as-null = added but empty). An `alwaysOn` filter shows
 * regardless — a fact of the definition, not of the state — so no URL and no
 * "Clear all" can take it off.
 */
export const isFilterActive = <G extends object>(
  f: Filter<G>,
  filter: G
): boolean => !!f.alwaysOn || f.key in filter;

/** The chips on the bar, in definition (display) order. */
export const activeFilters = <G extends object>(
  filters: Filter<G>[],
  filter: G
): Filter<G>[] => filters.filter(f => isFilterActive(f, filter));

/**
 * What the add-filter menu can still offer — whatever is not already a chip.
 * An `alwaysOn` filter is never offered, being permanently active.
 */
export const availableFilters = <G extends object>(
  filters: Filter<G>[],
  filter: G
): Filter<G>[] => filters.filter(f => !isFilterActive(f, filter));

/**
 * Should the bar offer "Clear all"?
 *
 * Only while a user-added chip is on the bar: "Clear all" is for the filters a
 * user adds, so a default (`alwaysOn`) filter never raises it, even holding a
 * value (Aimee, 2026-07-30) — its value is emptied by typing over it.
 */
export const showsClearAll = <G extends object>(
  filters: Filter<G>[],
  filter: G
): boolean => activeFilters(filters, filter).some(f => !f.alwaysOn);
