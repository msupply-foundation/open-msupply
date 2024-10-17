import {
  useMutation,
  useParams,
  useQueryClient,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useUpdateCustomerReturnLines = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  const { invoiceNumber = '' } = useParams();

  return useMutation(api.updateCustomerReturnLines, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.customerDetail(invoiceNumber)),
  });
};
