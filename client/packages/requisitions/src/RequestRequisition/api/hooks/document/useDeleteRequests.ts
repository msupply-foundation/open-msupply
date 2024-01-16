import {
  useQueryClient,
  useMutation,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';
import { AppRoute } from '@openmsupply-client/config';

export const useDeleteRequests = () => {
  const queryClient = useQueryClient();
  const api = useRequestApi();
  const navigate = useNavigate();
  return useMutation(api.deleteRequests, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base()),
        navigate(
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InternalOrder)
            .build()
        );
    },
  });
};
