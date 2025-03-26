import { isEmpty, useQuery } from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';

export const usePreferencesByKey = (key: string) => {
  const { api } = usePreferencesGraphQL();

  return useQuery({
    queryKey: ['prefsByKey', key],
    queryFn: async () => {
      const result = await api.prefsByKey({ key });
      // will be empty if there's a generic error, such as permission denied
      if (!isEmpty(result)) {
        return result.centralServer.preferences.preferencesByKey;
      }
      throw new Error('Could not query preferences');
    },
  });
};
