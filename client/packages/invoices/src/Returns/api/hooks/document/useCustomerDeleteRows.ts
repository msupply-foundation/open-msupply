import {
  useTableStore,
  useTranslation,
  useQueryClient,
  InvoiceNodeStatus,
  useDeleteConfirmation,
  useUrlQueryParams,
  useMutation,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { useCustomerReturns } from './useCustomerReturns';

export const useCustomerDeleteRows = () => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
  });
  const { data: rows } = useCustomerReturns(queryParams);
  const { mutateAsync } = useMutation(api.deleteCustomer);

  const selectedRows = useTableStore(
    state =>
      rows?.nodes.filter(({ id }) => state.rowState[id]?.isSelected) ?? []
  );
  const { clearSelected } = useTableStore();

  const deleteAction = async () => {
    await Promise.all(selectedRows.map(row => mutateAsync(row.id)))
      .then(() => {
        queryClient.invalidateQueries(api.keys.base());
        clearSelected();
      })
      .catch(err => {
        throw err;
      });
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

  return { confirmAndDelete, selectedRows };
};
