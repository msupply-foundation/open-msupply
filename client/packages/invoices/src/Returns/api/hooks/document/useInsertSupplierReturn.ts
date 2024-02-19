import {
  useQueryClient,
  useMutation,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { AppRoute } from 'packages/config/src';

export const useInsertSupplierReturn = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useReturnsApi();
  return useMutation(api.insertSupplierReturn, {
    onSuccess: invoiceNumber => {
      const route = RouteBuilder.create(AppRoute.Replenishment)
        .addPart(AppRoute.OutboundReturn)
        .addPart(String(invoiceNumber))
        .build();
      navigate(route, { replace: true });
      return queryClient.invalidateQueries(api.keys.base());
    },
  });
};
