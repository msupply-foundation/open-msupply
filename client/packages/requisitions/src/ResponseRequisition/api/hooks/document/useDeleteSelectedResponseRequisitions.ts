import {
  useTranslation,
  useTableStore,
  RequisitionNodeStatus,
  useDeleteConfirmation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { ResponseFragment } from '../../operations.generated';
import { useDeleteResponses } from './useDeleteResponses';
import { useResponses } from './useResponses';

export const useDeleteSelectedResponseRequisitions = () => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
  });
  const { data: rows } = useResponses(queryParams);
  const { mutateAsync } = useDeleteResponses();
  const t = useTranslation();
  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as ResponseFragment[],
  }));
  const deleteAction = async () => {
    let result = await mutateAsync(selectedRows).catch(err => {
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
