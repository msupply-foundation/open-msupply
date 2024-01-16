import {
  useQueryClient,
  useMutation,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';
import { AppRoute } from '@openmsupply-client/config';

export const useStocktakeDelete = () => {
  const queryClient = useQueryClient();
  const api = useStocktakeApi();
  const navigate = useNavigate();

  return useMutation(api.deleteStocktakes, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base()),
        navigate(
          RouteBuilder.create(AppRoute.Inventory)
            .addPart(AppRoute.Stocktakes)
            .build()
        );
    },
  });
};
