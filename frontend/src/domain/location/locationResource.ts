import { graphqlFetch } from '../../api/graphql';
import {
  Locations,
  LocationsWithVolume,
  type LocationsResult,
  type LocationsWithVolumeResult,
} from './location.generated';

// One location node (id + code + name) — the volume-blind shape.
export type Location = LocationsResult['locations']['nodes'][number];

// One location node WITH capacity (id + code + name + volume + volumeUsed +
// stock.totalCount) — the volume-aware shape backing LocationVolumeSelect.
export type LocationWithVolume =
  LocationsWithVolumeResult['locations']['nodes'][number];

// Locations own NO global cache (unlike masterLists). Two reasons:
//   1. `volumeUsed` is server-computed and shifts whenever stock moves, so a
//      cached capacity goes stale — the volume-aware picker must re-read.
//   2. Keeping both pickers uniform, every consumer fetches locally in its
//      parent route/view and passes the list down (spec/ui-standards/
//      components.md → Location lookup — plain vs volume-aware).
// These are plain fetches, not caches.

// Volume-blind fetch (code + name).
export const fetchLocations = async (
  storeId: string
): Promise<Location[] | undefined> => {
  const result = await graphqlFetch(Locations, { storeId });
  return result.kind === 'success' ? result.data.locations.nodes : undefined;
};

// Volume-aware fetch (+ volume / volumeUsed / stock.totalCount). Deliberately a
// plain fetch, not a cache: capacity is re-read fresh each time the consuming
// view mounts/refreshes, so the picker's % used and fullness filter reflect the
// current stock (see spec/stocktakes/contract.md → Consumed reads).
export const fetchLocationsWithVolume = async (
  storeId: string
): Promise<LocationWithVolume[] | undefined> => {
  const result = await graphqlFetch(LocationsWithVolume, { storeId });
  return result.kind === 'success' ? result.data.locations.nodes : undefined;
};
