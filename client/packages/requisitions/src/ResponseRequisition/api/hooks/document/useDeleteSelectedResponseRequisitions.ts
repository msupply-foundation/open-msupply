import {
  useTranslation,
  useTableStore,
  RequisitionNodeStatus,
  useDeleteConfirmation,
  useUrlQueryParams,
  useNotification,
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
  const { info } = useNotification();
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
    let errorMessages = [];
    // check for errors
    result.forEach(line => {
      if (line.response.__typename == 'DeleteResponseRequisitionError') {
        info(line.response.error.description)();
        errorMessages.push(line.response.error.description);
      }
    });
    if (errorMessages.length > 0) {
      throw new Error();
    }
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
      deleteSuccess: t('messages.deleted-orders', {
        count: selectedRows.length,
      }),
    },
  });
  return confirmAndDelete;
};
