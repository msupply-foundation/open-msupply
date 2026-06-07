import {
  isEmpty,
  PREFERENCES_QUERY_KEY,
  useMutation,
} from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';
import { PREFERENCE_DESCRIPTION_QUERY_KEY } from './keys';
import { CustomTranslationsV2 } from '../Components/CustomTranslations/helpers';

/**
 * Saves the v2 custom translations (the whole `language -> namespace -> key ->
 * value` structure) along with the language currently being edited. The
 * language lets the server flatten that language into the legacy v1 preference
 * for older sync clients.
 *
 * This is separate from the generic preference update because that only sends a
 * single field and can't attach the editing language.
 */
export const useUpsertCustomTranslationsV2 = () => {
  const { api, storeId, queryClient } = usePreferencesGraphQL();

  return useMutation({
    mutationFn: async ({
      translations,
      language,
    }: {
      translations: CustomTranslationsV2;
      language: string;
    }) => {
      const result = await api.upsertPreferences({
        storeId,
        input: {
          customTranslationsV2: translations,
          customTranslationsV2Language: language,
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
