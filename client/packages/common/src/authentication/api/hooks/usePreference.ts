import { gql } from 'graphql-tag';
import {
  PreferenceKey,
  PreferencesNode,
  useAuthContext,
  useQuery,
} from '@openmsupply-client/common';
import { useAuthApi } from './useAuthApi';

export const usePreference = <T extends PreferenceKey>(...prefs: T[]) => {
  const { keys, client } = useAuthApi();
  const { storeId } = useAuthContext();

  // Custom query, rather than using generated one, so we can
  // pass in the desired preference key as a variable
  const PreferencesDocument = gql`
  query preferences {
    preferences(storeId: "${storeId}") {
      ${prefs.map(pref => pref).join('\n')}
    }
  }
`;

  type PreferencesQuery = {
    __typename: 'Queries';
    // If there is a type error here, PreferenceKey enum and PreferencesNode
    // keys are not in sync. Regenerate the graphql types.
    preferences: Pick<PreferencesNode, '__typename' | T>;
  };

  return useQuery({
    queryKey: [keys.preferences(), ...prefs],
    queryFn: async () => {
      const result = await client.request<PreferencesQuery, undefined>(
        PreferencesDocument
      );
      return result.preferences;
    },
  });
};
