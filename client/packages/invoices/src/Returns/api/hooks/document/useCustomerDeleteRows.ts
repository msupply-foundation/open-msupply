import {
  useTranslation,
  useQueryClient,
  InvoiceNodeStatus,
  useDeleteConfirmation,
  useMutation,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { CustomerReturnRowFragment } from '../../operations.generated';

export const useCustomerDeleteRows = (
  selectedRows: CustomerReturnRowFragment[],
  resetRowSelection: () => void
) => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  const { mutateAsync } = useMutation(api.deleteCustomer);

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
    canDelete: selectedRows.every(
      ({ status }) => status === InvoiceNodeStatus.New
    ),
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
