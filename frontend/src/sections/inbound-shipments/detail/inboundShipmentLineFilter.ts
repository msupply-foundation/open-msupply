import type { InboundShipmentLinesVariables } from './inboundShipmentDetail.generated';

// The line-table filter, exactly as GraphQL expects it (kdd/type-safety — no
// remapping). Carried verbatim in the detail view's URL query state. Mirrors
// StocktakeLineFilter.
export type InboundLineFilter = NonNullable<
  InboundShipmentLinesVariables['filter']
>;
