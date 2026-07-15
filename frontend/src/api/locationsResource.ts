import { graphqlFetch } from './graphql';
import { Locations, type LocationsResult } from './locations.generated';
import { createStoreScopedResource } from './storeScopedResource';
import { currentStoreId } from '../store/storeContext';

// One location node (id + code + name).
export type Location = LocationsResult['locations']['nodes'][number];

// App-wide locations cache — same shape/rationale as masterListsResource: store-scoped,
// lazy, deduped, module-scope singleton, read via `.noSuspense()`.
export const locationsResource = createStoreScopedResource<Location>(
  currentStoreId,
  async storeId => {
    const result = await graphqlFetch(Locations, { storeId });
    return result.kind === 'success' ? result.data.locations.nodes : undefined;
  }
);
