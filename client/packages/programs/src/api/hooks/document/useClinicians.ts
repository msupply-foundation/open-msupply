import { useQuery } from '@openmsupply-client/common';
import { ClinicianListParams } from '../../api';
import { useClinicianApi } from '../utils/useClinicianApi';

export const useClinicians = (params: ClinicianListParams) => {
  const api = useClinicianApi();

  return useQuery(api.keys.list(params), () => api.clinicians(params));
};
