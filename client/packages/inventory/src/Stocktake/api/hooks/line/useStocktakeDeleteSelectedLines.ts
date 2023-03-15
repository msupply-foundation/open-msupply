import {
  useTableStoreWithSelector,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { StocktakeSummaryItem } from '../../../../types';
import { StocktakeLineFragment } from '../../operations.generated';
import { useTranslation } from '@common/intl';
import { useStocktakeRows } from './useStocktakeRows';
import { useStocktakeDeleteLines } from './useStocktakeDeleteLines';
import { useStocktake } from '..';

export const useStocktakeDeleteSelectedLines = (): (() => void) => {
  const { items, lines } = useStocktakeRows();
  const { mutateAsync } = useStocktakeDeleteLines();
  const t = useTranslation('inventory');
  const isDisabled = useStocktake.utils.isDisabled();

  const { selectedRows } = useTableStoreWithSelector(state => {
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
