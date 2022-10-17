import {
  useQueryClient,
  useNavigate,
  useMutation,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from 'packages/config/src';
import { useRequestApi } from '../utils/useRequestApi';

export const useInsertRequest = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useRequestApi();
  return useMutation(api.insert, {
    onSuccess: ({ requisitionNumber }) => {
      const route = RouteBuilder.create(AppRoute.Replenishment)
      .addPart(AppRoute.InternalOrder)
      .addPart(String(requisitionNumber))
      .build();
      navigate(route, {replace:true});
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
