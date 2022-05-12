import {
  useTranslation,
  useQueryClient,
  useMutation,
  useTableStore,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useRequestNumber } from '../document/useRequest';
import { useIsRequestDisabled } from '../utils/useIsRequestDisabled';
import { useRequestApi } from '../utils/useRequestApi';
import { useRequestLines } from './useRequestLines';

export const useDeleteRequestLines = () => {
  const { lines } = useRequestLines();
  const api = useRequestApi();
  const requestNumber = useRequestNumber();
  const isDisabled = useIsRequestDisabled();
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation(api.deleteLines, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(requestNumber)),
  });
  const t = useTranslation('replenishment');

  const selectedRows = useTableStore(state =>
    lines.filter(({ id }) => state.rowState[id]?.isSelected)
  );

  const onDelete = async () => {
    mutateAsync(selectedRows)
      // .then(() => queryClient.invalidateQueries(api.keys.base()))
      .catch(err => {
        throw err;
      });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: onDelete,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-delete-requisition-lines', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-lines', {
        count: selectedRows.length,
      }),
      cantDelete: t('label.cant-delete-disabled-requisition'),
    },
  });

  return confirmAndDelete;
};
