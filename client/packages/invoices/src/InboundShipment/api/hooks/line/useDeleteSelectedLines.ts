import {
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useIsInboundDisabled } from '../utils/useIsInboundDisabled';
import { useDeleteInboundLines } from './useDeleteInboundLines';
import { useInboundShipmentLineErrorContext } from '../../../context/inboundShipmentLineError';
import { mapErrorToMessageAndSetContext } from '../mapErrorToMessageAndSetContext';
import { InboundLineFragment } from '../../operations.generated';

export const useInboundDeleteSelectedLines = (
  rowsToDelete: InboundLineFragment[],
  resetRowSelection: () => void
): (() => void) => {
  const t = useTranslation();
  const { mutateAsync } = useDeleteInboundLines();
  const isDisabled = useIsInboundDisabled();
  const errorsContext = useInboundShipmentLineErrorContext();

  const onDelete = async () => {
    const result = await mutateAsync(rowsToDelete).catch(err => {
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
        rowsToDelete,
        t,
        errorsContext.setError
      );
      if (errMessage) {
        throw new Error(errMessage);
      }
    });
    resetRowSelection();
  };

  const handleCantDelete = ({ isDisabled }: { isDisabled: boolean }) => {
    if (isDisabled) return t('label.cant-delete-disabled');
    return (err: Error) => err.message;
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows: rowsToDelete,
    deleteAction: onDelete,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-delete-shipment-lines', {
        count: rowsToDelete.length,
      }),
      deleteSuccess: t('messages.deleted-lines', {
        count: rowsToDelete.length,
      }),
      cantDelete: handleCantDelete({ isDisabled }),
    },
  });

  return confirmAndDelete;
};
