import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useStocktakeNumber } from '../document/useStocktake';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useStocktakeDeleteLines = () => {
  const queryClient = useQueryClient();
  const stocktakeNumber = useStocktakeNumber();

  const api = useStocktakeApi();
  return useMutation(api.deleteLines, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.detail(stocktakeNumber)),
  });
};
