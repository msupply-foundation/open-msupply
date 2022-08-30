import { useQuery } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';
import { useEncounterId } from '../utils/useEncounterId';

export const useEncounter = () => {
  const api = useEncounterApi();
  const id = useEncounterId();

  return {
    ...useQuery(
      api.keys.detail(id),
      () => api.get.byId(id),
      // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
      // is inactive. For example, when navigating away from the page and back again, refetch.
      {
        refetchOnMount: false,
        cacheTime: 0,
      }
    ),
  };
};
