import {
  useQueryClient,
  useMutation,
  useTranslation,
  useNotification,
} from '@openmsupply-client/common';
import { useStocktakeNumber } from '../document/useStocktake';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useSaveStocktakeLines = () => {
  const stocktakeNumber = useStocktakeNumber();
  const queryClient = useQueryClient();
  const api = useStocktakeApi();
  const t = useTranslation(['inventory']);
  const { error } = useNotification();

  return useMutation(api.updateLines, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.detail(stocktakeNumber)),
    onError: e => {
      const { message } = e as Error;

      switch (message) {
        case 'StockLineReducedBelowZero': {
          return error(t('error.reduced-below-zero'))();
        }
        case 'AdjustmentReasonNotProvided': {
          return error(t('error.provide-reason'))();
        }
        default:
          return error(t('error.cant-save'))();
      }
    },
  });
};
