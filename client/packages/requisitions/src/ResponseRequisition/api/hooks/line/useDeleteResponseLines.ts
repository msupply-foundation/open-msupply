import {
  useQueryClient,
  useMutation,
  useTranslation,
  useTableStore,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useResponse } from '..';
import { useResponseNumber } from '../document/useResponse';
import { useResponseApi } from '../utils/useResponseApi';
import { useResponseLines } from './useResponseLines';

export const useDeleteResponseLines = () => {
  const { lines } = useResponseLines();
  const api = useResponseApi();
  const requestNumber = useResponseNumber();
  const isDisabled = useResponse.utils.isDisabled();
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation(api.deleteLines, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(requestNumber)),
  });
  const t = useTranslation();

  const selectedRows = useTableStore(state =>
    lines.filter(({ id }) => state.rowState[id]?.isSelected)
  );

  const onDelete = async () => {
    mutateAsync(selectedRows).catch(err => {
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
