import { AppRoute } from '@openmsupply-client/config';
import { useOutboundApi } from './../utils/useOutboundApi';
import {
  RouteBuilder,
  useMutation,
  useNavigate,
  useQueryClient,
} from '@openmsupply-client/common';

export const useOutboundDelete = () => {
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  const navigate = useNavigate();

  return useMutation(api.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
      navigate(
        RouteBuilder.create(AppRoute.Distribution)
          .addPart(AppRoute.OutboundShipment)
          .build()
      );
    },
  });
};
