import { gql } from 'graphql-tag';
import {
  PreferenceKey,
  PREFERENCES_QUERY_KEY,
  PreferencesNode,
  useAuthContext,
  useGql,
  useQuery,
} from '@openmsupply-client/common';

type PreferencesQuery = {
  __typename: 'Queries';
  preferences: PreferencesNode;
};

/** Fields undefined until query has loaded */
export const usePreferences = (): Partial<PreferencesNode> => {
  const { client } = useGql();
  const { storeId } = useAuthContext();

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
    queryKey: [PREFERENCES_QUERY_KEY, storeId],
    queryFn: async () => {
      const result = await client.request<PreferencesQuery, undefined>(
        PreferencesDocument
      );
      return result.preferences;
    },
    // Only refetch when explicitly invalidated (on sync/updating preferences)
    // Or when switching stores
    cacheTime: Infinity,
    staleTime: Infinity,
    suspense: true,
    enabled: !!storeId,
  });

  return data ?? {};
};
``;
