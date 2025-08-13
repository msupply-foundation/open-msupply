import { gql } from 'graphql-tag';
import {
  PreferenceKey,
  PreferencesNode,
  useQuery,
} from '@openmsupply-client/common';
// tODO move
import { usePreferencesGraphQL } from '@openmsupply-client/system/src/Manage/Preferences/api/usePreferencesGraphQL';

type PreferencesQuery = {
  __typename: 'Queries';
  // If there is a type error here, PreferenceKey enum and PreferencesNode
  // keys are not in sync. Regenerate the graphql types.
  preferences: PreferencesNode;
};

// Mount the hook on app startup somewhere...

/** Fields undefined until query has loaded */
export const usePreferences = (): Partial<PreferencesNode> => {
  const { storeId, client, PREFERENCES } = usePreferencesGraphQL();

  // Custom query, rather than using generated one, so new preferences
  // will be included without needing to update the generated types.
  const PreferencesDocument = gql`
  query preferences {
    preferences(storeId: "${storeId}") {
      ${Object.values(PreferenceKey).join('\n')}
    }
  }
`;

  const { data } = useQuery({
    queryKey: [PREFERENCES, storeId],
    queryFn: async () => {
      const result = await client.request<PreferencesQuery, undefined>(
        PreferencesDocument
      );
      return result.preferences;
    },
    // should only update when explicitly invalidated
    cacheTime: Infinity,
    staleTime: Infinity,
  });

  return data ?? {};
};
