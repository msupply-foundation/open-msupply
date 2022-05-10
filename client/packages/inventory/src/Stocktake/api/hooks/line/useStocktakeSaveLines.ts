import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useStocktakeNumber } from '../document/useStocktake';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useSaveStocktakeLines = () => {
  const stocktakeNumber = useStocktakeNumber();
  const queryClient = useQueryClient();
  const api = useStocktakeApi();
  return useMutation(api.updateLines, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.detail(stocktakeNumber)),
  });
};
