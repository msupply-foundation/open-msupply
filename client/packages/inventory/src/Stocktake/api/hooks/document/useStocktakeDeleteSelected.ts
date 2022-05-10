import {
  useTranslation,
  useNotification,
  useTableStore,
} from '@openmsupply-client/common';
import { canDeleteStocktake } from '../../../../utils';
import { StocktakeRowFragment } from '../../operations.generated';
import { useStocktakeDelete } from './useStocktakeDelete';
import { useStocktakes } from './useStocktakes';

export const useStocktakeDeleteSelected = () => {
  const t = useTranslation('inventory');
  const { data: rows } = useStocktakes();
  const { success, info } = useNotification();
  const { mutate } = useStocktakeDelete();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as StocktakeRowFragment[],
  }));

  const deleteAction = () => {
    const numberSelected = selectedRows.length;
    if (selectedRows && numberSelected > 0) {
      const canDeleteRows = selectedRows.every(canDeleteStocktake);
      if (!canDeleteRows) {
        const cannotDeleteSnack = info(t('messages.cant-delete-stocktakes'));
        cannotDeleteSnack();
      } else {
        const deletedMessage = t('messages.deleted-stocktakes', {
          number: numberSelected,
        });
        const successSnack = success(deletedMessage);
        mutate(selectedRows, { onSuccess: successSnack });
      }
    } else {
      const selectRowsSnack = info(t('messages.select-rows-to-delete'));
      selectRowsSnack();
    }
  };

  return deleteAction;
};
