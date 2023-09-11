import { AppRoute } from 'packages/config/src';
import {
  RouteBuilder,
  useMutation,
  useNavigate,
  useQueryClient,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useInboundDelete = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();
  const navigate = useNavigate();

  return useMutation(api.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
      navigate(
        RouteBuilder.create(AppRoute.Replenishment)
          .addPart(AppRoute.InboundShipment)
          .build()
      );
    },
  });
};
