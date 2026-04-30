import { useDeleteConfirmation } from '@openmsupply-client/common';
import { StocktakeLineFragment } from '../../operations.generated';
import { useTranslation } from '@common/intl';
import { useStocktakeDeleteLines } from './useStocktakeDeleteLines';
import { useIsStocktakeDisabled } from '../utils/useIsStocktakeDisabled';

export const useStocktakeDeleteSelectedLines = (
  selectedRows: StocktakeLineFragment[],
  clearSelection: () => void
): (() => void) => {
  const t = useTranslation();
  const isDisabled = useIsStocktakeDisabled();
  const { mutateAsync } = useStocktakeDeleteLines();

  const onDelete = async () => {
    await mutateAsync(selectedRows).catch(err => {
      throw err;
    });
    clearSelection();
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
