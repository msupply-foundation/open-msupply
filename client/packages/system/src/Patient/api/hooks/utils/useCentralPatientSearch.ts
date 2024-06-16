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
    ...useQuery(
      api.keys.centralSearch(params),
      () => api.get.centralSearch(params),
      { enabled: enabled && JSON.stringify(params) !== '{}' }
    ),
  };
};
