import {
  useTableStore,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { StocktakeSummaryItem } from '../../../../types';
import { StocktakeLineFragment } from '../../operations.generated';
import { useTranslation } from '@common/intl';
import { useStocktakeRows } from './useStocktakeRows';
import { useStocktakeDeleteLines } from './useStocktakeDeleteLines';

export const useStocktakeDeleteSelectedLines = (): (() => void) => {
  const { items, lines } = useStocktakeRows();
  const { mutateAsync } = useStocktakeDeleteLines();
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
    await mutateAsync(selectedRows)
      // .then(() => queryClient.invalidateQueries(api.keys.base()))
      .catch(err => {
        throw err;
      });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: onDelete,
    messages: {
      confirmMessage: t('messages.confirm-delete-stocktake_lines'),
      deleteSuccess: t('messages.deleted-lines', {
        number: selectedRows.length,
      }),
      cantDelete: t('label.cant-delete-disabled'),
    },
  });

  return confirmAndDelete;
};
