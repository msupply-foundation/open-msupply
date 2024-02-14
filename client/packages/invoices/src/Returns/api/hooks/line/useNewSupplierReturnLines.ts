import {
  useNotification,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useNewSupplierReturnLines = (stockLineIds: string[]) => {
  const t = useTranslation('replenishment');
  const { info, error } = useNotification();

  const api = useReturnsApi();

  const { refetch } = useQuery(
    api.keys.newReturns(stockLineIds),
    () => api.get.newSupplierReturnLines(stockLineIds),
    { enabled: false } // disable autofetch
  );

  return async () => {
    if (!stockLineIds.length) {
      const selectLinesSnack = info(t('messages.select-rows-to-return'));
      selectLinesSnack();
    } else {
      try {
        const { data } = await refetch();

        if (!data || !data.length) throw new Error('No data returned');

        return data;
      } catch (e) {
        const cannotReturnSnack = error(t('error.unable-to-load-data'));
        cannotReturnSnack();
        console.error(e instanceof Error ? e.message : e);
      }
    }
  };
};
