import {
  useQueryClient,
  useMutation,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { AppRoute } from '@openmsupply-client/config';

export const useInsertOutboundReturn = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useReturnsApi();
  return useMutation(api.insertOutboundReturn, {
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
