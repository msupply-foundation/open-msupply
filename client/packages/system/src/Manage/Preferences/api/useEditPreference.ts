import {
  isEmpty,
  PreferenceNodeType,
  PREFERENCES_QUERY_KEY,
  UpsertPreferencesInput,
  useMutation,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';
import { useAdminPrefsList } from './useAdminPrefsList';
import { PREFERENCE_DESCRIPTION_QUERY_KEY } from './keys';

export const useEditPreferences = (
  prefType: PreferenceNodeType,
  storeId?: string
) => {
  const t = useTranslation();
  const { error } = useNotification();

  const { data } = useAdminPrefsList(prefType, storeId);
  const { mutateAsync } = useUpsertPref();

  // Please add debouncing when string prefs are implemented
  const update = async (input: Partial<UpsertPreferencesInput>) => {
    try {
      await mutateAsync(input);
    } catch (err) {
      console.error('Error updating preferences:', err);
      error(t('error.something-wrong'))();
    }
  };

  return {
    preferences: data ?? [],
    update,
  };
};

const useUpsertPref = () => {
  const { api, storeId: requestStoreId, queryClient } = usePreferencesGraphQL();

  return useMutation(
    async (input: Partial<UpsertPreferencesInput>) => {
      const result = await api.upsertPreferences({
        input,
        storeId: requestStoreId,
      });
      if (!isEmpty(result)) {
        return result.centralServer.preferences;
      }
      throw new Error('Could not update preferences');
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(PREFERENCES_QUERY_KEY);
        queryClient.invalidateQueries(PREFERENCE_DESCRIPTION_QUERY_KEY);
      },
    }
  );
};
