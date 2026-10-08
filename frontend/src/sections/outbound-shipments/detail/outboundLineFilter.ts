import type { OutboundLinesVariables } from './outboundDetail.generated';

// The detail-view line filter, EXACTLY as GraphQL expects it (kdd/type-safety:
// no remapping — this is the generated outboundLines variables' filter shape).
// It flows straight through the query and is carried verbatim in the URL query
// state; there is no parallel value model and no client-side predicate.
//
// The detail table is server sorted / filtered / paged (spec rules.md §
// server-paginated line table), so the only filters we can offer are the ones
// the backend's InvoiceLineFilterInput supports. See outboundDetailFilters.tsx
// for which keys are exposed vs. dismissed. The view merges the fixed
// invoiceId + type scoping into the query variables itself — those never
// appear in this URL-carried shape.
export type OutboundLineFilter = NonNullable<OutboundLinesVariables['filter']>;
