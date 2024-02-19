import {
  useTableStore,
  useTranslation,
  useQueryClient,
  InvoiceNodeStatus,
  useDeleteConfirmation,
  useUrlQueryParams,
  useMutation,
} from '@openmsupply-client/common';
import { useOutbounds } from './useOutbounds';
import { useReturnsApi } from '../utils/useReturnsApi';

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
    await mutateAsync(selectedRows)
      .then(() => queryClient.invalidateQueries(api.keys.base()))
      .catch(err => {
        throw err;
      });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    // TODO: can probably use something like the outboundShipment canDeleteInvoice method once we know what statuses we'll allow here
    canDelete: selectedRows.every(
      ({ status }) => status === InvoiceNodeStatus.New
    ),
    messages: {
      confirmMessage: t('messages.confirm-delete-returns', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-shipments', {
        count: selectedRows.length,
      }),
    },
  });

  return confirmAndDelete;
};
