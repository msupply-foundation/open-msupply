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

  return useMutation({
    mutationFn: api.updateSupplierReturnLines,

    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: api.keys.supplierDetail(invoiceId)
      })
  });
};
