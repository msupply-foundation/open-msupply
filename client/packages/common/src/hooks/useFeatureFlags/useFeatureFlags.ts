/* 
  -- Feature Flags --

  Available feature flags should be listed below, with a description.
  To enable, set to true in local.yaml file.

  Example configuration/local.yaml:

  ```yaml
    # Add any other settings you need here, e.g. database connection, sync settings etc

    features:
      stock_movement: true
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
    // Stock movement (stock relocation) feature - hidden by default while in
    // development, can be enabled per-server via local.yaml
    stockMovement: !!featureFlags['stock_movement'],
  };
};
