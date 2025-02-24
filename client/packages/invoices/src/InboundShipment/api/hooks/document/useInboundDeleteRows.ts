import {
  useTableStore,
  useTranslation,
  useQueryClient,
  useMutation,
  InvoiceNodeStatus,
  useDeleteConfirmation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { useInbounds } from './useInbounds';

export const useInboundDeleteRows = () => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const api = useInboundApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
  });
  const { data: rows } = useInbounds(queryParams);
  const { mutateAsync } = useMutation(api.delete);

  const selectedRows = useTableStore(
    state =>
      rows?.nodes.filter(({ id }) => state.rowState[id]?.isSelected) ?? []
  );
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
    canDelete: selectedRows.every(
      ({ status }) => status === InvoiceNodeStatus.New
    ),
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
