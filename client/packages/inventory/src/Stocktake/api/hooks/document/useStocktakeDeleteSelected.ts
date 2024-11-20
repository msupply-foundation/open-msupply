import {
  useTranslation,
  useTableStore,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { canDeleteStocktake } from '../../../../utils';
import { StocktakeRowFragment } from '../../operations.generated';
import { useStocktakeDelete } from './useStocktakeDelete';
import { useStocktakes } from './useStocktakes';

export const useStocktakeDeleteSelected = () => {
  const t = useTranslation();
  const { data: rows } = useStocktakes();
  const { mutateAsync } = useStocktakeDelete();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as StocktakeRowFragment[],
  }));

  const deleteAction = async () => {
    await mutateAsync(selectedRows).catch(err => {
      throw err;
    });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    canDelete: selectedRows.every(canDeleteStocktake),
    messages: {
      confirmMessage: t('messages.confirm-delete-stocktakes', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-stocktakes', {
        count: selectedRows.length,
      }),
      cantDelete: t('label.cant-delete-disabled'),
    },
  });

  return confirmAndDelete;
};
