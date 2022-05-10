import { useNotification, useTableStore } from '@openmsupply-client/common';
import { StocktakeSummaryItem } from '../../../../types';
import { StocktakeLineFragment } from '../../operations.generated';
import { useTranslation } from '@common/intl';
import { useStocktakeRows } from './useStocktakeRows';
import { useStocktakeDeleteLines } from './useStocktakeDeleteLines';

export const useStocktakeDeleteSelectedLines = (): {
  onDelete: () => Promise<void>;
} => {
  const { success, info } = useNotification();
  const { items, lines } = useStocktakeRows();
  const { mutate } = useStocktakeDeleteLines();
  const t = useTranslation('inventory');

  const { selectedRows } = useTableStore(state => {
    const { isGrouped } = state;

    if (isGrouped) {
      return {
        selectedRows: (
          Object.keys(state.rowState)
            .filter(id => state.rowState[id]?.isSelected)
            .map(selectedId => items?.find(({ id }) => selectedId === id))
            .filter(Boolean) as StocktakeSummaryItem[]
        )
          .map(({ lines }) => lines)
          .flat(),
      };
    } else {
      return {
        selectedRows: Object.keys(state.rowState)
          .filter(id => state.rowState[id]?.isSelected)
          .map(selectedId => lines?.find(({ id }) => selectedId === id))
          .filter(Boolean) as StocktakeLineFragment[],
      };
    }
  });

  const onDelete = async () => {
    if (selectedRows && selectedRows?.length > 0) {
      const number = selectedRows?.length;
      const successSnack = success(t('messages.deleted-lines', { number }));
      await mutate(selectedRows, {
        onSuccess: successSnack,
      });
    } else {
      const infoSnack = info(t('messages.select-rows-to-delete-them'));
      infoSnack();
    }
  };

  return { onDelete };
};
