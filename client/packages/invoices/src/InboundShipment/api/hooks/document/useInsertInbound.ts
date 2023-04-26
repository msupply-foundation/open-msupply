import {
  useNavigate,
  useQueryClient,
  useMutation,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useInboundApi } from '../utils/useInboundApi';

export const useInsertInbound = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useInboundApi();
  return useMutation(api.insert, {
    onSuccess: invoiceNumber => {
      const route = RouteBuilder.create(AppRoute.Replenishment)
        .addPart(AppRoute.InboundShipment)
        .addPart(String(invoiceNumber))
        .build();
      navigate(route, { replace: true });
      return queryClient.invalidateQueries(api.keys.base());
    },
  });
};
