import {
  useTableStore,
  useTranslation,
  useQueryClient,
  useDeleteConfirmation,
  useUrlQueryParams,
  useMutation,
} from '@openmsupply-client/common';
import { useOutbounds } from './useOutbounds';
import { useReturnsApi } from '../utils/useReturnsApi';
import { canDeleteOutboundReturn } from '../../../../utils';

export const useOutboundDeleteRows = () => {
  const queryClient = useQueryClient();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
  });
  const { data: rows } = useOutbounds(queryParams);
  const api = useReturnsApi();
  const { mutateAsync } = useMutation(api.deleteOutbound);
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
    canDelete: selectedRows.every(canDeleteOutboundReturn),
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
