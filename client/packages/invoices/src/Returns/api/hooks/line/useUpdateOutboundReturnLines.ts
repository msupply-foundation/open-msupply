import {
  useMutation,
  useParams,
  useQueryClient,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useUpdateOutboundReturnLines = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  const { invoiceNumber = '' } = useParams();

  return useMutation(api.updateOutboundReturnLines, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.detail(invoiceNumber)),
  });
};
