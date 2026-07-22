import { graphqlFetch } from '../../api/graphql';
import type { Location } from '../../domain/location';
import {
  StockLocations,
  type StockLocationsResult,
} from './stockLocations.generated';

// The store's locations with their type, for the stock location pickers (S2/S3).
// A location can be restricted to a type by the item; the picker offers only
// matching locations when a restriction is set (spec/stock S2/S3), and the
// server enforces IncorrectLocationType regardless.

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
// type when one is set (spec/stock S2/S3), mapped to the domain Location shape
// LocationSelect consumes ({ id, code, name }).
export const locationsForItem = (
  all: StockLocation[],
  restrictedLocationTypeId: string | null | undefined
): Location[] =>
  all
    .filter(
      l =>
        !restrictedLocationTypeId ||
        l.locationType?.id === restrictedLocationTypeId
    )
    .map(l => ({ id: l.id, code: l.code, name: l.name }));
