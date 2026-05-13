import { useQuery, keepPreviousData } from '@openmsupply-client/common';
import { ClinicianListParams } from '../../api';
import { useClinicianApi } from '../utils/useClinicianApi';

export const useClinicians = (params: ClinicianListParams) => {
  const api = useClinicianApi();

  return useQuery({
    queryKey: api.keys.list(params),
    queryFn: () => api.clinicians(params),
    placeholderData: keepPreviousData
  });
};
