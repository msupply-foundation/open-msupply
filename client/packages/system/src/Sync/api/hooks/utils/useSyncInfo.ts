import { useIsCentralServerApi } from '@openmsupply-client/common';
import { useSyncInfoV5V6 } from './useSyncInfoV5V6';
import { useSyncInfoV7 } from './useSyncInfoV7';

/**
 * Role-aware sync info: V5/V6 on a central server, V7 on a remote site.
 * Returns `{ syncStatus, numberOfRecordsInPushQueue }`. See `useSyncStatus`
 * for the rationale on calling both hooks unconditionally.
 */
export const useSyncInfo = (
  refetchInterval: number | false = false,
  enabled: boolean = true
) => {
  const isCentralServer = useIsCentralServerApi();
  const v5 = useSyncInfoV5V6(refetchInterval, enabled && isCentralServer);
  const v7 = useSyncInfoV7(refetchInterval, enabled && !isCentralServer);
  return isCentralServer ? v5 : v7;
};
