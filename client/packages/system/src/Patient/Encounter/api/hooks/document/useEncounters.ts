import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { usePatient } from '../../../../api';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useEncounters = () => {
  const api = useEncounterApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'type', dir: 'asc' },
  });
  const patientId = usePatient.utils.id();
  const params = {
    ...queryParams,
    filterBy: { patientId: { equalTo: patientId } },
  };
  return {
    ...useQuery(api.keys.paramList(params), () => api.get.list(params)),
  };
};
