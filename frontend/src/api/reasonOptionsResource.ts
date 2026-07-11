import { graphqlFetch } from './graphql';
import { ReasonOptions, type ReasonOptionsResult } from './reasonOptions.generated';
import { createStoreScopedResource } from './storeScopedResource';
import { currentStoreId } from '../store/storeContext';

// One reason option (id + type + reason label).
export type ReasonOption = ReasonOptionsResult['reasonOptions']['nodes'][number];

// App-wide inventory-adjustment reason cache — same shape/rationale as locationsResource: lazy,
// deduped, module-scope singleton, read via `.noSuspense()`. The reasonOptions query itself takes
// no storeId (reasons are global), but we still key the resource on currentStoreId so a store
// switch re-fetches — cheap, and keeps the one resource helper (kdd/state-management). Consumers
// filter to the reason TYPE they need (e.g. the stocktake line editor keeps the inventory
// adjustment types).
export const reasonOptionsResource = createStoreScopedResource<ReasonOption>(
  currentStoreId,
  async () => {
    const result = await graphqlFetch(ReasonOptions, {});
    return result.kind === 'success' ? result.data.reasonOptions.nodes : undefined;
  },
);
