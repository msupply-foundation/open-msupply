import {
  useTranslation,
  RequisitionNodeStatus,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { ResponseFragment } from '../../operations.generated';
import { useDeleteResponses } from './useDeleteResponses';

export const useDeleteSelectedResponseRequisitions = (
  selectedRows: ResponseFragment[],
  resetRowSelection: () => void
) => {
  const { mutateAsync } = useDeleteResponses();
  const t = useTranslation();
  const deleteAction = async () => {
    const result = await mutateAsync(selectedRows).catch(err => {
      throw err;
    });
    // check for errors
    result.forEach(line => {
      if (line.response.__typename == 'DeleteResponseRequisitionError') {
        switch (line.response.error.__typename) {
          case 'FinalisedRequisition':
            throw Error(t('messages.cannot-delete-finalised-requisition'));
          case 'RecordNotFound':
            throw Error(t('messages.record-not-found'));
          case 'RequisitionWithShipment':
            throw Error(t('messages.cannot-delete-requisition-with-shipment'));
          case 'TransferredRequisition':
            throw Error(t('messages.cannot-delete-transfer-requisition'));
        }
      }
    });
    resetRowSelection();
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    canDelete: selectedRows.every(
      ({ status }) => status !== RequisitionNodeStatus.Finalised
    ),
    messages: {
      confirmMessage: t('messages.confirm-delete-requisitions', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-requisitions', {
        count: selectedRows.length,
      }),
      cantDelete: (err: Error) => err.message,
    },
  });
  return { confirmAndDelete, selectedRows };
};
