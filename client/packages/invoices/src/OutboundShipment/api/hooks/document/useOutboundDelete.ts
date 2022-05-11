import { OutboundRowFragment } from './../../operations.generated';
import { useOutboundApi } from './../utils/useOutboundApi';
import {
  useQueryClient,
  useTranslation,
  useMutation,
  useTableStore,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useOutbounds } from './useOutbounds';
import { canDeleteInvoice } from '../../../../utils';

export const useOutboundDelete = () => {
  const queryClient = useQueryClient();
  const { data: rows } = useOutbounds();
  const api = useOutboundApi();
  const { mutateAsync } = useMutation(api.delete);
  const t = useTranslation('distribution');

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as OutboundRowFragment[],
  }));

  const deleteAction = async () => {
    await mutateAsync(selectedRows)
      .then(() => queryClient.invalidateQueries(api.keys.base()))
      .catch(err => {
        throw err;
      });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    canDelete: selectedRows.every(canDeleteInvoice),
    messages: {
      confirmMessage: t('messages.confirm-delete-shipments'),
      deleteSuccess: t('messages.deleted-shipments', {
        count: selectedRows.length,
      }),
    },
  });

  return confirmAndDelete;
};
