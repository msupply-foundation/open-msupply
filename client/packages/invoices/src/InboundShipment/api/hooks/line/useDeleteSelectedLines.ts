import {
  useTableStore,
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useIsInboundDisabled } from '../utils/useIsInboundDisabled';
import { useDeleteInboundLines } from './useDeleteInboundLines';
import { useInboundRows } from './useInboundRows';
import { useInboundShipmentLineErrorContext } from '../../../context/inboundShipmentLineError';
import { mapErrorToMessageAndSetContext } from '../mapErrorToMessageAndSetContext';

export const useDeleteSelectedLines = (): (() => void) => {
  const t = useTranslation();
  const { items, lines } = useInboundRows();
  const { mutateAsync } = useDeleteInboundLines();
  const isDisabled = useIsInboundDisabled();
  const errorsContext = useInboundShipmentLineErrorContext();

  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) =>
              lines.map(line => ({
                ...line,
                isDeleted: true,
              }))
            )
            .flat()
        : lines
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(line => ({
              ...line,
              isDeleted: true,
            }));
    }) || [];

  const onDelete = async () => {
    const result = await mutateAsync(selectedRows).catch(err => {
      throw err;
    });
    const deletedLines = result.batchInboundShipment.deleteInboundShipmentLines;
    if (!deletedLines) {
      return;
    }
    errorsContext.unsetAll();

    deletedLines?.forEach(line => {
      const errMessage = mapErrorToMessageAndSetContext(
        line,
        selectedRows,
        t,
        errorsContext.setError
      );
      if (errMessage) {
        throw new Error(errMessage);
      }
    });
  };

  const handleCantDelete = ({ isDisabled }: { isDisabled: boolean }) => {
    if (isDisabled) return t('label.cant-delete-disabled');
    return (err: Error) => err.message;
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
      cantDelete: handleCantDelete({ isDisabled }),
    },
  });

  return confirmAndDelete;
};
