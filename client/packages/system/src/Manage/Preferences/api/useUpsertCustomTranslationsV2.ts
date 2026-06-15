import {
  isEmpty,
  PREFERENCES_QUERY_KEY,
  useMutation,
} from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';
import { PREFERENCE_DESCRIPTION_QUERY_KEY } from './keys';
import { CustomTranslationsV2 } from '../Components/CustomTranslations/helpers';

/**
 * Saves the v2 custom translations (`language -> namespace -> key -> value`)
 * and, optionally, the legacy v1 flat map (edited via the "legacy" namespace).
 * The two preferences are independent: saving v2 never derives v1.
 *
 * Separate from the generic preference update because that only sends a single
 * field and can't send both at once.
 */
export const useUpsertCustomTranslationsV2 = () => {
  const { api, storeId, queryClient } = usePreferencesGraphQL();

  return useMutation({
    mutationFn: async ({
      customTranslationsV2,
      customTranslations,
    }: {
      customTranslationsV2: CustomTranslationsV2;
      // v1 flat map; only sent when the legacy namespace was edited
      customTranslations?: Record<string, string>;
    }) => {
      const result = await api.upsertPreferences({
        storeId,
        input: {
          customTranslationsV2,
          ...(customTranslations !== undefined ? { customTranslations } : {}),
        },
      });
      if (!isEmpty(result)) {
        return result.centralServer.preferences;
      }
      throw new Error('Could not update preferences');
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PREFERENCES_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [PREFERENCE_DESCRIPTION_QUERY_KEY],
      });
    },
  });
};
