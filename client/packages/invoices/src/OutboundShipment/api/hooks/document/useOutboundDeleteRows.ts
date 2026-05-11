import { OutboundRowFragment } from '../../operations.generated';
import { useOutboundApi } from '../utils/useOutboundApi';
import {
  useQueryClient,
  useTranslation,
  useMutation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { canDeleteInvoice } from '../../../../utils';

export const useOutboundDeleteRows = (
  rowsToDelete: OutboundRowFragment[],
  resetRowSelection: () => void
) => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  const { mutateAsync } = useMutation(api.delete);

  const deleteAction = async () => {
    await mutateAsync(rowsToDelete)
      .then(() => {
        resetRowSelection();
        queryClient.invalidateQueries(api.keys.base());
      })
      .catch(err => {
        throw err;
      });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows: rowsToDelete,
    deleteAction,
    canDelete: rowsToDelete.every(canDeleteInvoice),
    messages: {
      confirmMessage: t('messages.confirm-delete-shipments', {
        count: rowsToDelete.length,
      }),
      deleteSuccess: t('messages.deleted-shipments', {
        count: rowsToDelete.length,
      }),
    },
  });

  return { confirmAndDelete };
};
