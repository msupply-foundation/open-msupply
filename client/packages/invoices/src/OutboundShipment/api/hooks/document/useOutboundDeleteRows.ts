import { OutboundRowFragment } from '../../operations.generated';
import { useOutboundApi } from '../utils/useOutboundApi';
import {
  useQueryClient,
  useTranslation,
  useMutation,
  useTableStore,
  useDeleteConfirmation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useOutbounds } from './useOutbounds';
import { canDeleteInvoice } from '../../../../utils';

export const useOutboundDeleteRows = () => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
  });
  const { data: rows } = useOutbounds(queryParams);
  const { mutateAsync } = useMutation(api.delete);

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as OutboundRowFragment[],
  }));
  const { clearSelected } = useTableStore();

  const deleteAction = async () => {
    await mutateAsync(selectedRows)
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
    canDelete: selectedRows.every(canDeleteInvoice),
    messages: {
      confirmMessage: t('messages.confirm-delete-shipments', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-shipments', {
        count: selectedRows.length,
      }),
    },
  });

  return { confirmAndDelete, selectedRows };
};
