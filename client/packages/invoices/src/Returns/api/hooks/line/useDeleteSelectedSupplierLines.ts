import {
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { SupplierReturnLineFragment, useReturns } from '../..';
import { useSupplierReturnIsDisabled } from '../utils/useSupplierReturnIsDisabled';

interface DeleteSelectedSupplierLinesOutput {
  confirmAndDelete: () => void;
  selectedIds: string[];
}

export const useDeleteSelectedSupplierReturnLines = ({
  returnId,
  selectedRows,
  resetRowSelection,
}: {
  returnId: string;
  selectedRows: SupplierReturnLineFragment[];
  resetRowSelection: () => void;
}): DeleteSelectedSupplierLinesOutput => {
  const isDisabled = useSupplierReturnIsDisabled();
  const t = useTranslation();

  const { mutateAsync: updateLines } = useReturns.lines.updateSupplierLines();

  const onDelete = async () => {
    await updateLines({
      supplierReturnId: returnId,
      supplierReturnLines: selectedRows.map(({ id }) => ({
        id,
        stockLineId: '',
        numberOfPacksToReturn: 0,
      })),
    }).catch(err => {
      throw err;
    });
    resetRowSelection();
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: onDelete,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-delete-invoice-lines', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-lines', {
        count: selectedRows.length,
      }),
      cantDelete: t('label.cant-delete-disabled'),
    },
  });

  return {
    confirmAndDelete,
    selectedIds: selectedRows.map(row => row.id),
  };
};
