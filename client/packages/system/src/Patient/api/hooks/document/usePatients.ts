import { useQuery } from '@openmsupply-client/common';
import { ListParams } from '../../api';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatients = (query: ListParams, enabled?: boolean) => {
  const api = usePatientApi();

  return useQuery(api.keys.paramList(query), () => api.get.list(query), {
    enabled,
  });
};
