import {
  useTranslation,
  useQueryClient,
  useDeleteConfirmation,
  useMutation,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { canDeleteSupplierReturn } from '../../../../utils';
import { SupplierReturnRowFragment } from '../../operations.generated';

export const useSupplierDeleteRows = (
  selectedRows: SupplierReturnRowFragment[],
  resetRowSelection: () => void
) => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  const { mutateAsync } = useMutation(api.deleteSupplier);

  const deleteAction = async () => {
    await Promise.all(selectedRows.map(row => mutateAsync(row.id)))
      .then(() => queryClient.invalidateQueries(api.keys.base()))
      .catch(err => {
        throw err;
      });
    resetRowSelection();
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    canDelete: selectedRows.every(canDeleteSupplierReturn),
    messages: {
      confirmMessage: t('messages.confirm-delete-returns', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-returns', {
        count: selectedRows.length,
      }),
    },
  });

  return { confirmAndDelete };
};
