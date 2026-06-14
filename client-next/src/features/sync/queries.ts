import { queryOptions } from '@tanstack/react-query';
import { syncSdk } from './api';

// Flattened view of the (V5V6 | V7) latestSyncStatus union + push-queue count.
export interface SyncStatus {
  isSyncing: boolean;
  errorMessage?: string;
  numberOfRecordsInPushQueue: number;
  lastSuccessfulSync?: string;
}

export const syncKeys = { status: ['syncStatus'] as const };

export function syncStatusQueryOptions() {
  return queryOptions({
    queryKey: syncKeys.status,
    queryFn: async (): Promise<SyncStatus> => {
      const res = await syncSdk.syncStatus();
      const s = res.latestSyncStatus; // isSyncing/error/lastSuccessfulSync common to both union members
      return {
        isSyncing: s?.isSyncing ?? false,
        errorMessage: s?.error?.fullError ?? undefined,
        numberOfRecordsInPushQueue: res.numberOfRecordsInPushQueue,
        lastSuccessfulSync: s?.lastSuccessfulSync?.finished ?? undefined,
      };
    },
  });
}
