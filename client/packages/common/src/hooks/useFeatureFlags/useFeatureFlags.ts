/*
  -- Feature Flags --

  Available feature flags should be listed below, with a description.
  To enable, set to true in local.yaml file.

  - enable_multi_site: Central server only. Enables the "Multi device" toggle on
    the Manage > Sites edit screen. Multi-device sync is not ready for general
    use (only a subset of tables sync), so the toggle is disabled unless this
    flag is set. See issue #12522.

  Example configuration/local.yaml:

  ```yaml
    # Add any other settings you need here, e.g. database connection, sync settings etc

    features:
      my_feature: true
  ```
*/

import { useGql, useQuery } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useFeatureFlags = () => {
  const { client } = useGql();
  const api = getSdk(client);

  const { data: featureFlags = {} } = useQuery({
    queryKey: ['featureFlags'],
    queryFn: async () => (await api.featureFlags()).featureFlags,

    // Only invalidates on app restart
    gcTime: Infinity,
    staleTime: Infinity,
  });

  return {
    ...featureFlags,
  };
};
