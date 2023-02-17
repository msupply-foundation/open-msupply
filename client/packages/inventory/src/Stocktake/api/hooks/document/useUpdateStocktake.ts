import {
  useQueryClient,
  useMutation,
  useTranslation,
  useNotification,
} from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useUpdateStocktake = () => {
  const queryClient = useQueryClient();
  const api = useStocktakeApi();
  const t = useTranslation(['inventory']);
  const { error } = useNotification();

  return useMutation(api.update, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
    onError: e => {
      const { message } = e as Error;

      switch (message) {
        case 'StockLinesReducedBelowZero': {
          return error(t('error.stocktake-has-stock-reduced-below-zero'))();
        }
        default:
          return error(t('error.cant-save'))();
      }
    },
  });
};
