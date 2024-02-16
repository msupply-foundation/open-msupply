import {
  useTableStore,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { StocktakeSummaryItem } from '../../../../types';
import { StocktakeLineFragment } from '../../operations.generated';
import { useTranslation } from '@common/intl';
import { useStocktakeDeleteLines } from './useStocktakeDeleteLines';
import { useStocktakeRows } from './useStocktakeRows';

export const useStocktakeDeleteSelectedLines = (): (() => void) => {
  const { isDisabled, items, lines } = useStocktakeRows();
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
    await mutateAsync(selectedRows).catch(err => {
      throw err;
    });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: onDelete,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-delete-stocktake_lines', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-lines', {
        count: selectedRows.length,
      }),
      cantDelete: t('messages.cant-delete-generic'),
    },
  });

  return confirmAndDelete;
};
