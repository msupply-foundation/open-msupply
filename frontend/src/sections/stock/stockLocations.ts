import { graphqlFetch } from '../../api/graphql';
import {
  StockLocations,
  type StockLocationsResult,
} from './stockLocations.generated';

// The store's locations with their type AND their capacity, for this vertical's
// three location fields (S2 detail, S3 new stock, S5 repack). All three place
// stock at a location, so all three use the volume-aware picker (spec/stock/
// rules.md › location fields: which picker where) — the capacity fields travel
// with the node so its "% used" and fullness filter have something to read.
// A location can additionally be restricted to a type by the item; the picker
// offers only matching locations when a restriction is set (spec/stock S2/S3),
// and the server enforces IncorrectLocationType regardless.

export type StockLocation = Extract<
  StockLocationsResult['locations'],
  { __typename: 'LocationConnector' }
>['nodes'][number];

export const fetchStockLocations = async (
  storeId: string
): Promise<StockLocation[]> => {
  const result = await graphqlFetch(StockLocations, { storeId });
  if (result.kind !== 'success') return [];
  return result.data.locations.__typename === 'LocationConnector'
    ? result.data.locations.nodes
    : [];
};

// The locations offered for an item, narrowed to the item's restricted location
// type when one is set (spec/stock S2/S3). A filter, never a projection: the
// node is handed to LocationVolumeSelect whole, capacity fields included.
// Mapping it down to { id, code, name } here is what silently strips the
// picker's "% used" and fullness filter — the node keeps the generated shape
// (CLAUDE.md › don't remap GraphQL-derived types).
export const locationsForItem = (
  all: StockLocation[],
  restrictedLocationTypeId: string | null | undefined
): StockLocation[] =>
  all.filter(
    l =>
      !restrictedLocationTypeId ||
      l.locationType?.id === restrictedLocationTypeId
  );
