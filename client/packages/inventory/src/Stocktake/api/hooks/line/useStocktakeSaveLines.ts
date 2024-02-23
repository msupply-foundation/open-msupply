import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useStocktake } from '../document/useStocktake';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useSaveStocktakeLines = () => {
  const { data: stocktake } = useStocktake();
  const queryClient = useQueryClient();
  const api = useStocktakeApi();

  return useMutation(api.updateLines, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.detail(stocktake?.id ?? '')),
  });
};
