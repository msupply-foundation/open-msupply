import {
  useTableStore,
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useReturns } from '../..';
import { useSupplierReturnRows } from './useSupplierReturnRows';
import { useSupplierReturnIsDisabled } from '../utils/useSupplierReturnIsDisabled';

export const useDeleteSelectedSupplierReturnLines = ({
  returnId,
}: {
  returnId: string;
}): (() => void) => {
  const { items, lines } = useSupplierReturnRows();
  const isDisabled = useSupplierReturnIsDisabled();
  const t = useTranslation('distribution');

  const { mutateAsync: updateLines } = useReturns.lines.updateSupplierLines();

  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) => lines.flat())
            .flat()
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    })?.map(({ id }) => ({
      id,
      stockLineId: '',
      numberOfPacksToReturn: 0,
    })) || [];

  const onDelete = async () => {
    await updateLines({
      supplierReturnId: returnId,
      supplierReturnLines: selectedRows,
    }).catch(err => {
      throw err;
    });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: onDelete,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-delete-lines', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-lines', {
        count: selectedRows.length,
      }),
      cantDelete: t('label.cant-delete-disabled'),
    },
  });

  return confirmAndDelete;
};
