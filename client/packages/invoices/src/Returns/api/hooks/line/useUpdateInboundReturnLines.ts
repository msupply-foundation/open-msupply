import {
  useMutation,
  useParams,
  useQueryClient,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useUpdateInboundReturnLines = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  const { invoiceNumber = '' } = useParams();

  return useMutation(api.updateInboundReturnLines, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.inboundDetail(invoiceNumber)),
  });
};
