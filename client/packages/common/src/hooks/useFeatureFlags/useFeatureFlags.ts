/* 
  -- Feature Flags --

  Available feature flags should be listed below, with a description.
  To enable, set to true in local.yaml file.

  Example configuration/local.yaml:

  ```yaml
    # Add any other settings you need here, e.g. database connection, sync settings etc

    feature_flags:
      table_usability_improvements: true
      load_remote_plugins_in_dev: true
      create_stocktake_modal_usability_improvements: true
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
    cacheTime: Infinity,
    staleTime: Infinity,
  });

  return {
    // Enable the new demo create stocktake modal (see https://github.com/msupply-foundation/open-msupply/issues/8773)
    createStocktakeModalUsabilityImprovements:
      !!featureFlags['create_stocktake_modal_usability_improvements'],
    // Enable the new demo table, with better usability
    tableUsabilityImprovements: !!featureFlags['table_usability_improvements'],
  };
};
