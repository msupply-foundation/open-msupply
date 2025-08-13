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
  });
};
