import { useOutboundApi } from './../utils/useOutboundApi';
import {
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';

export const useOutboundDelete = () => {
  const queryClient = useQueryClient();
  const api = useOutboundApi();

  return useMutation(api.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
