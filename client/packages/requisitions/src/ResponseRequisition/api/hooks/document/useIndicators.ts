import { useQueryClient, useQuery } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';

export const useIndicators = (customerNameLinkId: string, periodId: string) => {
  const queryClient = useQueryClient();
  const api = useResponseApi();
  return useQuery(api.keys.indicators(), ()=> api.getIndicators(customerNameLinkId, periodId), {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.indicators());
    },
  });
};
