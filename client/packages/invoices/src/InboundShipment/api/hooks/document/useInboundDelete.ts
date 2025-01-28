import {
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useInboundDelete = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();

  return useMutation(api.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
