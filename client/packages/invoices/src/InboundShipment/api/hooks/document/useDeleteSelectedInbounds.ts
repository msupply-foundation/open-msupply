import {
  useTableStore,
  useTranslation,
  useNotification,
  useQueryClient,
  useMutation,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { useInbounds } from './useInbounds';

export const useDeleteSelectedInbounds = () => {
  const queryClient = useQueryClient();
  const { data: rows } = useInbounds();
  const api = useInboundApi();
  const { mutate } = useMutation(api.delete);
  const t = useTranslation('replenishment');

  const { success, info } = useNotification();

  const selectedRows = useTableStore(
    state =>
      rows?.nodes.filter(({ id }) => state.rowState[id]?.isSelected) ?? []
  );

  const deleteAction = () => {
    const count = selectedRows?.length;
    if (selectedRows && count > 0) {
      const canDeleteRows = selectedRows.every(
        ({ status }) => status === InvoiceNodeStatus.New
      );
      if (!canDeleteRows) {
        const cannotDeleteSnack = info(t('messages.cant-delete-invoices'));
        cannotDeleteSnack();
      } else {
        mutate(selectedRows, {
          onSettled: () => queryClient.invalidateQueries(api.keys.base()),
        });
        const deletedMessage = t('messages.deleted-invoices', { count });
        const successSnack = success(deletedMessage);
        successSnack();
      }
    } else {
      const selectRowsSnack = info(t('messages.select-rows-to-delete'));
      selectRowsSnack();
    }
  };

  return deleteAction;
};
