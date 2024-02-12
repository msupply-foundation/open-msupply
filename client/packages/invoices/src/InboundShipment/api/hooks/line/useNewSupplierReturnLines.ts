import {
  useNotification,
  useQuery,
  useTableStore,
  useTranslation,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { useInboundRows } from './useInboundRows';

export const useNewSupplierReturnLines = () => {
  const t = useTranslation('replenishment');
  const { info } = useNotification();

  const api = useInboundApi();

  const { items, lines } = useInboundRows();

  const selectedIds =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) => lines.flat())
            .flat()
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    })?.map(({ id }) => id) || [];

  const { refetch } = useQuery(
    api.keys.newReturns(selectedIds),
    () => api.get.newSupplierReturnLines(selectedIds),
    { enabled: false } // disable autofetch
  );

  return async () => {
    if (!selectedIds.length) {
      const selectLinesSnack = info(t('messages.select-rows-to-return'));
      selectLinesSnack();
    } else {
      const { data } = await refetch();
      return data;
      // tODO: handle error
    }
  };
};
