import {
  useTranslation,
  RequisitionNodeStatus,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { RequestRowFragment } from '../../operations.generated';
import { useDeleteRequests } from './useDeleteRequests';

export const useDeleteSelectedRequisitions = (
  selectedRows: RequestRowFragment[],
  resetRowSelection: () => void
) => {
  const { mutateAsync } = useDeleteRequests();
  const t = useTranslation();
  const deleteAction = async () => {
    await mutateAsync(selectedRows).catch(err => {
      throw err;
    });
    resetRowSelection();
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    canDelete: selectedRows.every(
      ({ status }) => status === RequisitionNodeStatus.Draft
    ),
    messages: {
      confirmMessage: t('messages.confirm-delete-internal-orders', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-orders', {
        count: selectedRows.length,
      }),
      cantDelete: t('messages.cant-delete-requisitions'),
    },
  });
  return { confirmAndDelete };
};
