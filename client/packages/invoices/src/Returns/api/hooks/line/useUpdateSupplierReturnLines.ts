import {
  useMutation,
  useParams,
  useQueryClient,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useUpdateSupplierReturnLines = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  const { invoiceId = '' } = useParams();

  return useMutation(api.updateSupplierReturnLines, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.supplierDetail(invoiceId)),
  });
};
