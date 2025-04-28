import {
  isEmpty,
  UpsertPreferencesInput,
  useAuthApi,
  useMutation,
} from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';

export const useEditPreference = () => {
  const { api, storeId: requestStoreId, queryClient } = usePreferencesGraphQL();
  const { keys } = useAuthApi();

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
      onSuccess: () => queryClient.invalidateQueries(keys.preferences()),
    }
  );
};
