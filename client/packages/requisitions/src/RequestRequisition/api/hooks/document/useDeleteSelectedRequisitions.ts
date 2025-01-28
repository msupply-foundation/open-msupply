import {
  useTranslation,
  useTableStore,
  RequisitionNodeStatus,
  useDeleteConfirmation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { RequestRowFragment } from '../../operations.generated';
import { useDeleteRequests } from './useDeleteRequests';
import { useRequests } from './useRequests';

export const useDeleteSelectedRequisitions = () => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
  });
  const { data: rows } = useRequests(queryParams);
  const { mutateAsync } = useDeleteRequests();
  const t = useTranslation('replenishment');
  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as RequestRowFragment[],
  }));
  const deleteAction = async () => {
    await mutateAsync(selectedRows).catch(err => {
      throw err;
    });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    canDelete: selectedRows.every(
      ({ status }) => status === RequisitionNodeStatus.Draft
    ),
    messages: {
      confirmMessage: t('messages.confirm-delete-requisitions', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-requisitions', {
        count: selectedRows.length,
      }),
      cantDelete: t('messages.cant-delete-requisitions'),
    },
  });
  return confirmAndDelete;
};
