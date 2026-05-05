import {
  CentralPatientSearchInput,
  useQuery,
} from '@openmsupply-client/common';
import { usePatientApi } from '../utils/usePatientApi';

export const useCentralPatientSearch = (
  params: CentralPatientSearchInput,
  enabled?: boolean
) => {
  const api = usePatientApi();
  return {
    ...useQuery({
      queryKey: api.keys.centralSearch(params),
      queryFn: () => api.get.centralSearch(params),
      enabled: enabled && JSON.stringify(params) !== '{}'
    }),
  };
};
