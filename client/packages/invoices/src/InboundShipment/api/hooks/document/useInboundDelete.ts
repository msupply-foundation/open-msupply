import {
  useTableStore,
  useTranslation,
  useQueryClient,
  useMutation,
  InvoiceNodeStatus,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { useInbounds } from './useInbounds';

export const useInboundDelete = () => {
  const queryClient = useQueryClient();
  const { data: rows } = useInbounds();
  const api = useInboundApi();
  const { mutateAsync } = useMutation(api.delete);
  const t = useTranslation('replenishment');

  const selectedRows = useTableStore(
    state =>
      rows?.nodes.filter(({ id }) => state.rowState[id]?.isSelected) ?? []
  );

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
    canDelete: selectedRows.every(
      ({ status }) => status === InvoiceNodeStatus.New
    ),
    messages: {
      confirmMessage: t('messages.confirm-delete-shipments'),
      deleteSuccess: t('messages.deleted-shipments', {
        count: selectedRows.length,
      }),
    },
  });

  return confirmAndDelete;
};
