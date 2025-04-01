import { FnUtils, isEmpty, useMutation } from '@openmsupply-client/common';
import { JsonData } from '@openmsupply-client/programs';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';

export const useEditPreference = (key: string) => {
  const { api, storeId: requestStoreId, queryClient } = usePreferencesGraphQL();

  return useMutation(
    async ({
      id,
      value,
      storeId: preferenceStoreId,
    }: {
      id?: string;
      value: JsonData;
      storeId?: string;
    }) => {
      const result = await api.upsertPreference({
        input: {
          key,
          id: id ?? FnUtils.generateUUID(),
          value: JSON.stringify(value),
          storeId: preferenceStoreId,
        },
        storeId: requestStoreId,
      });
      if (!isEmpty(result)) {
        return result.centralServer.preferences;
      }
      throw new Error('Could not update preferences');
    },
    {
      onSuccess: () => queryClient.invalidateQueries(['prefsByKey', key]),
    }
  );
};
