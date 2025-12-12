import {
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useCustomerReturnIsDisabled } from '../utils/useCustomerReturnIsDisabled';
import { CustomerReturnLineFragment, useReturns } from '../..';

export const useDeleteSelectedCustomerReturnLines = (
  returnId: string,
  selectedRows: CustomerReturnLineFragment[],
  resetRowSelection: () => void
): () => void => {
  const isDisabled = useCustomerReturnIsDisabled();
  const t = useTranslation();

  const { mutateAsync: updateLines } = useReturns.lines.updateCustomerLines();

  const onDelete = async () => {
    await updateLines({
      customerReturnId: returnId,
      customerReturnLines: selectedRows.map(({ id, itemId, packSize }) => ({
        id,
        itemId,
        packSize,
        numberOfPacksReturned: 0,
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

  return confirmAndDelete;
};
