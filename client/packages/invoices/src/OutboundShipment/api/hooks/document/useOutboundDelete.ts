import { OutboundRowFragment } from './../../operations.generated';
import { useOutboundApi } from './../utils/useOutboundApi';
import {
  useQueryClient,
  useTranslation,
  useMutation,
  useNotification,
  useTableStore,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useOutbounds } from './useOutbounds';
import { canDeleteInvoice } from '../../../../utils';

export const useOutboundDelete = () => {
  const queryClient = useQueryClient();
  const { data: rows } = useOutbounds();
  const api = useOutboundApi();
  const { mutate } = useMutation(api.delete);
  const t = useTranslation(['common', 'replenishment']);

  const { success, info } = useNotification();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as OutboundRowFragment[],
  }));

  const deleteData = () => {
    mutate(selectedRows, {
      onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
    });
    const deletedMessage = t('messages.deleted-invoices', {
      count: selectedRows.length,
    });
    const successSnack = success(deletedMessage);
    successSnack();
  };

  const confirmDelete = useConfirmationModal({
    onConfirm: deleteData,
    message: t('messages.delete-shipment-warning'),
    title: t('heading.are-you-sure'),
  });

  const deleteAction = () => {
    const numberSelected = selectedRows.length;
    if (selectedRows && numberSelected > 0) {
      const canDeleteRows = selectedRows.every(canDeleteInvoice);
      if (!canDeleteRows) {
        const cannotDeleteSnack = info(t('messages.cant-delete-invoices'));
        cannotDeleteSnack();
      } else {
        confirmDelete();
      }
    } else {
      const selectRowsSnack = info(t('messages.select-rows-to-delete'));
      selectRowsSnack();
    }
  };

  return deleteAction;
};
