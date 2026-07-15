import { graphqlFetch } from './graphql';
import { MasterLists, type MasterListsResult } from './masterLists.generated';
import { createStoreScopedResource } from './storeScopedResource';
import { currentStoreId } from '../store/storeContext';

// One master-list node (id + name) — what a picker needs.
export type MasterList = MasterListsResult['masterLists']['nodes'][number];

// App-wide master-lists cache: fetched once per store, shared/deduped, refetched on store
// change (createStoreScopedResource). Module-scope singleton so the dedup is real — every
// consumer reads this one instance. Read via `.noSuspense()` at the call site so a pending
// first load never trips a <Suspense> boundary (kdd/state-management: no remounts).
export const masterListsResource = createStoreScopedResource<MasterList>(
  currentStoreId,
  async storeId => {
    const result = await graphqlFetch(MasterLists, { storeId });
    return result.kind === 'success'
      ? result.data.masterLists.nodes
      : undefined;
  }
);
