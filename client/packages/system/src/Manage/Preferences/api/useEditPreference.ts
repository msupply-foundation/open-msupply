import {
  isEmpty,
  UpsertPreferencesInput,
  useMutation,
} from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';

export const useEditPreference = () => {
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
      onSuccess: () => queryClient.invalidateQueries(['preferences']), // todo share
    }
  );
};
