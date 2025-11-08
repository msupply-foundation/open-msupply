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

// Map of complex preference fields that require subfield selection,
// If they are a complext type, they must be included in the query or we get an error from the graphql server
// These must be kept in sync with the GraphQL schema.
// If a new complex preference type is added, add it here with its subfields.
const COMPLEX_PREFERENCE_FIELDS: Record<string, string> = {
  warnWhenMissingRecentStocktake: `
    enabled
    maxAge
    minItems
  `,
};

/** Fields undefined until query has loaded */
export const usePreferences = (): Partial<PreferencesNode> => {
  const { client } = useGql();
  const { storeId } = useAuthContext();

  // Build field list with subfields for complex types
  const fields = Object.values(PreferenceKey)
    .map(key => {
      const subfields = COMPLEX_PREFERENCE_FIELDS[key];
      return subfields ? `${key} { ${subfields} }` : key;
    })
    .join('\n');

  // Custom query, rather than using generated one, so new preferences
  // will be included without needing to update the generated types.
  const PreferencesDocument = gql`
  query preferences {
    preferences(storeId: "${storeId}") {
      ${fields}
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
  });

  return data ?? {};
};
