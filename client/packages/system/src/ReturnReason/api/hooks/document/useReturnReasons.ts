import { useQuery } from '@openmsupply-client/common';
import { useReturnReasonApi } from '../utils/useReturnReasonApi';

export const useReturnReasons = () => {
  const api = useReturnReasonApi();
  const result = useQuery(api.keys.list(), () => api.get.listAllActive());
  return { ...result };
};
