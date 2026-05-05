import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useStocktakeId } from '../document/useStocktake';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useStocktakeDeleteLines = () => {
  const queryClient = useQueryClient();
  const stocktakeId = useStocktakeId();

  const api = useStocktakeApi();
  return useMutation({
    mutationFn: api.deleteLines,

    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: api.keys.detail(stocktakeId)
      })
  });
};
