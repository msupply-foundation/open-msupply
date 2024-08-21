import {
  useTableStore,
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useCustomerReturnRows } from './useCustomerReturnRows';
import { useCustomerReturnIsDisabled } from '../utils/useCustomerReturnIsDisabled';
import { useReturns } from '../..';

export const useDeleteSelectedCustomerReturnLines = ({
  returnId,
}: {
  returnId: string;
}): (() => void) => {
  const { items, lines } = useCustomerReturnRows();
  const isDisabled = useCustomerReturnIsDisabled();
  const t = useTranslation('distribution');

  const { mutateAsync: updateLines } = useReturns.lines.updateCustomerLines();

  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) => lines.flat())
            .flat()
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    })?.map(({ id, itemId, packSize, batch, expiryDate }) => ({
      id,
      itemId,
      packSize,
      batch,
      expiryDate,
      numberOfPacksReturned: 0,
    })) || [];

  const onDelete = async () => {
    await updateLines({
      customerReturnId: returnId,
      customerReturnLines: selectedRows,
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
