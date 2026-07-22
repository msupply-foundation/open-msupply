import { graphqlFetch } from '../../api/graphql';
import { Campaigns, type CampaignsResult } from './campaigns.generated';
import { createStoreScopedResource } from '../../api/storeScopedResource';
import { currentStoreId } from '../../store/storeContext';

// One campaign node (id + name) — what a picker needs to label + submit.
export type Campaign = CampaignsResult['campaigns']['nodes'][number];

// App-wide campaigns cache — same shape/rationale as vvmStatusesResource:
// store-scoped, lazy, deduped, module-scope singleton, read via noSuspense().
// The server already sorts by name; an empty list is the common case on stores
// with no campaigns configured.
export const campaignsResource = createStoreScopedResource<Campaign>(
  currentStoreId,
  async storeId => {
    const result = await graphqlFetch(Campaigns, { storeId });
    return result.kind === 'success' ? result.data.campaigns.nodes : undefined;
  }
);
