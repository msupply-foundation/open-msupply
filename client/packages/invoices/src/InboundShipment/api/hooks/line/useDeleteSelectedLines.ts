import {
  useTableStore,
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useIsInboundDisabled } from '../utils/useIsInboundDisabled';
import { useDeleteInboundLines } from './useDeleteInboundLines';
import { useInboundRows } from './useInboundRows';

export const useDeleteSelectedLines = (): (() => void) => {
  const { items, lines } = useInboundRows();
  const { mutateAsync } = useDeleteInboundLines();
  const isDisabled = useIsInboundDisabled();
  const t = useTranslation('replenishment');

  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) => lines.flat())
            .flat()
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    }) || [];
  const onDelete = async () => {
    const result = await mutateAsync(selectedRows).catch(err => {
      throw err;
    });
    const errorsOnDelete =
      result.batchInboundShipment.deleteInboundShipmentLines?.filter(
        line => 'error' in line.response
      );
    if (errorsOnDelete && errorsOnDelete?.length > 0) {
      const err = { message: t('messages.cant-delete-generic') };
      throw err;
    }
    return;
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: onDelete,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-delete-shipment-lines', {
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
