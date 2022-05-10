import {
  useNavigate,
  useQueryClient,
  useMutation,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useInsertInbound = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useInboundApi();
  return useMutation(api.insert, {
    onSuccess: invoiceNumber => {
      navigate(String(invoiceNumber));
      return queryClient.invalidateQueries(api.keys.base());
    },
  });
};
