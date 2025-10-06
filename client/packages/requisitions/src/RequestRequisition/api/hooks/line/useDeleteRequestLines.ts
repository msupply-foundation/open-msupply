import {
  useTranslation,
  useQueryClient,
  useMutation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useRequestId } from '../document/useRequest';
import { useIsRequestDisabled } from '../utils/useIsRequestDisabled';
import { useRequestApi } from '../utils/useRequestApi';

export const useDeleteRequestLines = () => {
  const t = useTranslation();
  const api = useRequestApi();
  const queryClient = useQueryClient();
  const requestId = useRequestId();
  const isDisabled = useIsRequestDisabled();
  const { mutateAsync } = useMutation(api.deleteLines, {
    onSettled: () => queryClient.invalidateQueries(api.keys.detail(requestId)),
  });

  const selectedRows = [];

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
      cantDelete: t('label.cant-delete-disabled-internal-order'),
    },
  });

  return { selectedRows, confirmAndDelete };
};
