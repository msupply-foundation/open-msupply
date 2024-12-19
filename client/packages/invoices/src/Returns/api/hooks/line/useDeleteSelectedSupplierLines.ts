import {
  useTableStore,
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useReturns } from '../..';
import { useSupplierReturnRows } from './useSupplierReturnRows';
import { useSupplierReturnIsDisabled } from '../utils/useSupplierReturnIsDisabled';

interface DeleteSelectedSupplierLinesOutputProps {
  onDelete: () => void;
  selectedIds: string[];
}

interface DeleteSelectedSupplierLinesProps {
  returnId: string;
}

export const useDeleteSelectedSupplierReturnLines = ({
  returnId,
}: DeleteSelectedSupplierLinesProps): DeleteSelectedSupplierLinesOutputProps => {
  const { items, lines } = useSupplierReturnRows();
  const isDisabled = useSupplierReturnIsDisabled();
  const t = useTranslation();

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
