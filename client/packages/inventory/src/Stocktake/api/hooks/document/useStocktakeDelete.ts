import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useStocktakeDelete = () => {
  const queryClient = useQueryClient();
  const api = useStocktakeApi();

  return useMutation({
    mutationFn: api.deleteStocktakes,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: api.keys.base()
      });
    }
  });
};
