import {
  useQueryClient,
  useMutation,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { AppRoute } from '@openmsupply-client/config';

export const useInsertInboundReturn = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useReturnsApi();
  return useMutation(api.insertInboundReturn, {
    onSuccess: invoiceNumber => {
      const route = RouteBuilder.create(AppRoute.Distribution)
        .addPart(AppRoute.InboundReturn)
        .addPart(String(invoiceNumber))
        .build();
      navigate(route);
      return queryClient.invalidateQueries(api.keys.base());
    },
  });
};
