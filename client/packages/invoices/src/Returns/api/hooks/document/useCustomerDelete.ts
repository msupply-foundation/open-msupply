import {
  RouteBuilder,
  useMutation,
  useNavigate,
  useQueryClient,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useCustomerReturnDelete = () => {
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: api.deleteCustomer,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: api.keys.base()
      });
      navigate(
        RouteBuilder.create(AppRoute.Distribution)
          .addPart(AppRoute.CustomerReturn)
          .build()
      );
    }
  });
};
