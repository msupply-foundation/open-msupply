import {
  useQueryClient,
  useNavigate,
  useMutation,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useRequestApi } from '../utils/useRequestApi';

export const useInsertProgramRequest = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useRequestApi();
  return useMutation(api.insertProgram, {
    onSuccess: ({ requisitionNumber }) => {
      const route = RouteBuilder.create(AppRoute.Replenishment)
        .addPart(AppRoute.InternalOrder)
        .addPart(String(requisitionNumber))
        .build();
      navigate(route, { replace: true });
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
