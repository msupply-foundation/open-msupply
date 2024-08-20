import {
  useQueryClient,
  useMutation,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { AppRoute } from '@openmsupply-client/config';

export const useInsertSupplierReturn = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useReturnsApi();
  return useMutation(api.insertSupplierReturn, {
    onSuccess: invoiceNumber => {
      const route = RouteBuilder.create(AppRoute.Replenishment)
        .addPart(AppRoute.SupplierReturn)
        .addPart(String(invoiceNumber))
        .build();
      navigate(route, { replace: true });
      return queryClient.invalidateQueries(api.keys.base());
    },
  });
};
