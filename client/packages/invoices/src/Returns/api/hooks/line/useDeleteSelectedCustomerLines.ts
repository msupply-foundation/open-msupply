import {
  useTableStore,
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useCustomerReturnRows } from './useCustomerReturnRows';
import { useCustomerReturnIsDisabled } from '../utils/useCustomerReturnIsDisabled';
import { useReturns } from '../..';

interface DeleteSelectedCustomerReturnLinesOutputProps {
  onDelete: () => void;
  selectedIds: string[];
}

interface DeleteSelectedCustomerReturnLinesProps {
  returnId: string;
}

export const useDeleteSelectedCustomerReturnLines = ({
  returnId,
}: DeleteSelectedCustomerReturnLinesProps): DeleteSelectedCustomerReturnLinesOutputProps => {
  const { items, lines } = useCustomerReturnRows();
  const isDisabled = useCustomerReturnIsDisabled();
  const t = useTranslation();

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
    onDelete: confirmAndDelete,
    selectedIds: selectedRows.map(row => row.id),
  };
};
