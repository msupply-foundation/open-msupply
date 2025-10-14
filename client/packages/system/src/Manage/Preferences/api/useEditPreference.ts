import {
  isEmpty,
  PreferenceKey,
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
  const { error, warning } = useNotification();

  const { data } = useAdminPrefsList(prefType, storeId);
  const { mutateAsync } = useUpsertPref();

  const processThreshold = (
    input: Partial<UpsertPreferencesInput>
  ): boolean => {
    const inputFirstThreshold =
      input?.firstThresholdForExpiringItems?.[0]?.value;
    const inputSecondThreshold =
      input?.secondThresholdForExpiringItems?.[0]?.value;

    // Second threshold should not exceed 30 days
    if (inputSecondThreshold && inputSecondThreshold > 30) {
      warning(t('label.second-threshold-exceeds-days'))();
      return false;
    }

    const existingFirstThreshold = data?.find(
      pref => pref.key === PreferenceKey.FirstThresholdForExpiringItems
    )?.value;
    const existingSecondThreshold = data?.find(
      pref => pref.key === PreferenceKey.SecondThresholdForExpiringItems
    )?.value;

    const firstThreshold = inputFirstThreshold ?? existingFirstThreshold;
    const secondThreshold = inputSecondThreshold ?? existingSecondThreshold;

    // Second threshold should not be less than first threshold
    if (
      firstThreshold != null &&
      secondThreshold != null &&
      secondThreshold < firstThreshold
    ) {
      warning(t('label.second-threshold-is-less-than-first-threshold'))();
      return false;
    }
    return true;
  };

  const update = async (
    input: Partial<UpsertPreferencesInput>
  ): Promise<boolean /* wasSuccessful */> => {
    if (!processThreshold(input)) return false;

    try {
      await mutateAsync(input);
      return true;
    } catch (err) {
      console.error('Error updating preferences:', err);
      error(t('error.something-wrong'))();
      return false;
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
