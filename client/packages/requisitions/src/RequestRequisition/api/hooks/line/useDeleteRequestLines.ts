import {
  useTranslation,
  useQueryClient,
  useMutation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useRequestId } from '../document/useRequest';
import { useIsRequestDisabled } from '../utils/useIsRequestDisabled';
import { useRequestApi } from '../utils/useRequestApi';
import { RequestLineFragment } from '../..';

export const useDeleteRequestLines = (
  selectedRows: RequestLineFragment[],
  resetRowSelection: () => void
) => {
  const t = useTranslation();
  const api = useRequestApi();
  const queryClient = useQueryClient();
  const requestId = useRequestId();
  const isDisabled = useIsRequestDisabled();
  const { mutateAsync } = useMutation(api.deleteLines, {
    onSettled: () => queryClient.invalidateQueries(api.keys.detail(requestId)),
  });

  const onDelete = async () => {
    await mutateAsync(selectedRows).catch(err => {
      throw err;
    });
    resetRowSelection();
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
