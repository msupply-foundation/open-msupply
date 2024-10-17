import {
  useTableStore,
  useTranslation,
  useQueryClient,
  useDeleteConfirmation,
  useUrlQueryParams,
  useMutation,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { canDeleteSupplierReturn } from '../../../../utils';
import { useSupplierReturns } from './useSupplierReturns';

export const useSupplierDeleteRows = () => {
  const queryClient = useQueryClient();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
  });
  const { data: rows } = useSupplierReturns(queryParams);
  const api = useReturnsApi();
  const { mutateAsync } = useMutation(api.deleteSupplier);
  const t = useTranslation('replenishment');

  const selectedRows = useTableStore(
    state =>
      rows?.nodes.filter(({ id }) => state.rowState[id]?.isSelected) ?? []
  );

  const deleteAction = async () => {
    await Promise.all(selectedRows.map(row => mutateAsync(row.id)))
      .then(() => queryClient.invalidateQueries(api.keys.base()))
      .catch(err => {
        throw err;
      });
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

  return confirmAndDelete;
};
