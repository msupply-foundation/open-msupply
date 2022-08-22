import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';
import { useEncounterId } from '../utils/useEncounterId';

export const useEncounter = () => {
  const api = useEncounterApi();
  const id = useEncounterId();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'startDatetime', dir: 'desc' },
  });
  const params = {
    ...queryParams,
    filterBy: { name: { equalTo: id } },
  };
  return {
    ...useQuery(api.keys.paramList(params), () => api.get.byId(id)),
  };
};
