import {
  useTableStore,
  useTranslation,
  useDeleteConfirmation,
  noOtherVariants,
} from '@openmsupply-client/common';
import { useIsInboundDisabled } from '../utils/useIsInboundDisabled';
import { useDeleteInboundLines } from './useDeleteInboundLines';
import { useInboundRows } from './useInboundRows';
import { useInbound } from '..';
import { useInboundShipmentLineErrorContext } from '../../../context/inboundShipmentLineError';

export const useDeleteSelectedLines = (): (() => void) => {
  const t = useTranslation();
  const { items, lines } = useInboundRows();
  const { mutateAsync } = useDeleteInboundLines();
  const isDisabled = useIsInboundDisabled();
  const { data } = useInbound.document.get();
  const isManuallyCreated = !data?.linkedShipment?.id;
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
      if (line.response.__typename === 'DeleteResponse') return;
      const { error } = line.response;
      switch (error.__typename) {
        case 'BatchIsReserved':
          const row = selectedRows.find(it => it.id === line.id);
          throw Error(
            t('label.inbound-shipment-cant-delete-reserved-line', {
              batch: row?.batch ?? '',
              itemCode: row?.item.code ?? '?',
            })
          );
        case 'LineLinkedToTransferredInvoice':
          errorsContext.setError(line.id, error);
          throw Error(t('messages.cant-delete-transferred'));
        case 'CannotEditInvoice':
        case 'ForeignKeyError':
        case 'RecordNotFound':
          throw Error(t('error.database-error'));
        default:
          noOtherVariants(error);
      }
    });
  };

  interface handleCantDelete {
    isDisabled: boolean;
    isManuallyCreated: boolean;
  }

  const handleCantDelete = ({ isDisabled }: handleCantDelete) => {
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
      cantDelete: handleCantDelete({ isDisabled, isManuallyCreated }),
    },
  });

  return confirmAndDelete;
};
