import { queryOptions } from '@tanstack/react-query';
import { brandingSdk } from './api';
import { brandingHashes, storeBranding } from './branding';

export const brandingKeys = { displaySettings: ['displaySettings'] as const };

/**
 * Fetch server-distributed branding. The server returns customTheme/customLogo
 * only when their hash differs from what we send, so this is cheap to poll on
 * app load. Side-effect: persists + applies any change via storeBranding.
 */
export function displaySettingsQueryOptions() {
  return queryOptions({
    queryKey: brandingKeys.displaySettings,
    queryFn: async () => {
      const res = await brandingSdk.displaySettings({
        input: brandingHashes(),
      });
      const ds = res.displaySettings;
      storeBranding({ theme: ds.customTheme, logo: ds.customLogo });
      return ds;
    },
    staleTime: 5 * 60_000,
  });
}
