import { PreferenceNodeType, useQuery } from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';
import { PREFERENCE_DESCRIPTION_QUERY_KEY } from './keys';

export const useAdminPrefsList = (
  prefType: PreferenceNodeType,
  storeId?: string
) => {
  const { api, storeId: loggedInStoreId } = usePreferencesGraphQL();

  return useQuery({
    queryKey: [PREFERENCE_DESCRIPTION_QUERY_KEY, prefType, storeId],
    queryFn: async () => {
      const result = await api.adminPreferenceList({
        storeId: loggedInStoreId,
        prefType,
        prefContext: {
          storeId,
        },
      });

      return result.preferenceDescriptions;
    },
    // Store preferences require a store id to load - skip the query until one
    // is available (e.g. while the store is loading, or for non-store names)
    enabled: prefType !== PreferenceNodeType.Store || !!storeId,
  });
};
