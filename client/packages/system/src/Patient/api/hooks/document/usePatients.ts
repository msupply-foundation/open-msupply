import { useMutation, useQuery } from '@openmsupply-client/common';
import { ListParams } from '../../api';
import { usePatientApi } from '../utils/usePatientApi';

export const usePatientsPromise = () => {
  const api = usePatientApi();

  return useMutation({
    mutationFn: async (query: ListParams) => {
      const patients = await api.get.list(query);

      return {
        patients,
      };
    }
  });
};

export const usePatients = (query: ListParams, enabled?: boolean) => {
  const api = usePatientApi();

  return useQuery({
    queryKey: api.keys.paramList(query),
    queryFn: () => api.get.list(query),
    enabled,
    keepPreviousData: true
  });
};
