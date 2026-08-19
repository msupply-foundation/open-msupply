import { graphqlFetch } from '../../api/graphql';
import { Campaigns, type CampaignsResult } from './campaigns.generated';
import { createStoreScopedResource } from '../../api/storeScopedResource';
import { currentStoreId } from '../../store/storeContext';

// One campaign node (id + name) — what a picker needs to label + submit.
export type Campaign = CampaignsResult['campaigns']['nodes'][number];

// App-wide campaigns cache — same mechanism as vvmStatusesResource: lazy,
// deduped, module-scope singleton, read via noSuspense(). The register itself
// is INSTALLATION-WIDE (`storeId` authorises, it does not scope — every store
// reads the same set); the store-scoped cache key is only the resource
// plumbing's refresh-on-store-switch, not a claim about the data. The server
// already sorts by name; an empty register is the common case.
export const campaignsResource = createStoreScopedResource<Campaign>(
  currentStoreId,
  async storeId => {
    const result = await graphqlFetch(Campaigns, { storeId });
    return result.kind === 'success' ? result.data.campaigns.nodes : undefined;
  }
);
