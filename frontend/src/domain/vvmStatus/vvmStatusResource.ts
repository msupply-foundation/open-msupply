import { graphqlFetch } from '../../api/graphql';
import {
  ActiveVvmStatuses,
  type ActiveVvmStatusesResult,
} from './vvmStatus.generated';
import { createStoreScopedResource } from '../../api/storeScopedResource';
import { currentStoreId } from '../../store/storeContext';

// One VVM-status node (id + code + description + priority) — what a picker
// needs.
export type VvmStatus =
  ActiveVvmStatusesResult['activeVvmStatuses']['nodes'][number];

// App-wide active-VVM-statuses cache — same shape/rationale as
// locationsResource: store-scoped, lazy, deduped, module-scope singleton, read
// via `.noSuspense()`. Ordered by `priority` (the vial-monitor progression) so
// every picker lists them in a stable, meaningful order.
export const vvmStatusesResource = createStoreScopedResource<VvmStatus>(
  currentStoreId,
  async storeId => {
    const result = await graphqlFetch(ActiveVvmStatuses, { storeId });
    if (result.kind !== 'success') return undefined;
    return [...result.data.activeVvmStatuses.nodes].sort(
      (a, b) => a.priority - b.priority
    );
  }
);
