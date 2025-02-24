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
  const t = useTranslation();
  const api = useRequestApi();
  const queryClient = useQueryClient();
  const requestNumber = useRequestNumber();
  const isDisabled = useIsRequestDisabled();
  const { lines } = useRequestLines();
  const { mutateAsync } = useMutation(api.deleteLines, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(requestNumber)),
  });

  const selectedRows = useTableStore(state =>
    lines.filter(({ id }) => state.rowState[id]?.isSelected)
  );
  const { clearSelected } = useTableStore();

  const onDelete = async () => {
    mutateAsync(selectedRows)
      .then(() => clearSelected())
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
      cantDelete: t('label.cant-delete-disabled-internal-order'),
    },
  });

  return { selectedRows, confirmAndDelete };
};
