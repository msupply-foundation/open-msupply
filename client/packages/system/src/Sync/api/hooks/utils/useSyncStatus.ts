import { useIsCentralServerApi } from '@openmsupply-client/common';
import { useSyncStatusV5V6 } from './useSyncStatusV5V6';
import { useSyncStatusV7 } from './useSyncStatusV7';

/**
 * Role-aware sync status: V5/V6 on a central server, V7 on a remote site.
 * Both underlying hooks are subscribed unconditionally to satisfy hook rules;
 * only one has live data depending on the server's role. The returned `data`
 * is the union shape — top-level fields (`isSyncing`, `summary`,
 * `lastSuccessfulSync`, `error`) are common; per-step fields differ. Use
 * `mapSyncError` to translate the error regardless of variant.
 *
 * For typed access to a specific variant's per-step fields, import
 * `useSyncStatusV5V6` or `useSyncStatusV7` directly.
 */
export const useSyncStatus = (
  refetchInterval: number | false = false,
  enabled?: boolean,
  requireAuth?: boolean
) => {
  const isCentralServer = useIsCentralServerApi();
  const v5 = useSyncStatusV5V6(refetchInterval, enabled, requireAuth);
  const v7 = useSyncStatusV7(refetchInterval, enabled, requireAuth);
  return isCentralServer ? v5 : v7;
};
