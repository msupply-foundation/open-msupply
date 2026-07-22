import type { StocktakeLinesVariables } from './lines/stocktakeDetail.generated';

// The detail-view line filter, EXACTLY as GraphQL expects it (kdd/type-safety:
// no remapping — this is the generated stocktakeLines variables' filter shape).
// It flows straight through the query and is carried verbatim in the URL query
// state; there is no parallel value model and no client-side predicate.
//
// This replaces the old client-side filter (which matched the whole loaded
// connection in memory): the detail table is now server sorted / filtered /
// paged (kdd/stocktake-line-editing), so the only filters we can offer are the
// ones the backend's StocktakeLineFilterInput supports. See
// stocktakeDetailFilters.tsx for which keys are exposed vs. dismissed (with
// TODOs for batch / expiry / "show error lines", which the server can't filter
// on yet).
export type StocktakeLineFilter = NonNullable<
  StocktakeLinesVariables['filter']
>;
