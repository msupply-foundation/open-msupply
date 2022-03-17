import {
  RouteBuilder,
  useNavigate,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useOutboundApi } from './../utils/useOutboundApi';

export const useOutboundInsert = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useOutboundApi();
  return useMutation(api.insert, {
    onSuccess: invoiceNumber => {
      const route = RouteBuilder.create(AppRoute.Distribution)
        .addPart(AppRoute.OutboundShipment)
        .addPart(String(invoiceNumber))
        .build();
      navigate(route, { replace: true });
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
