import {
  isEmpty,
  useMutation,
  useTranslation,
  useNotification,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useItemApi, useItemGraphQL } from '../useItemApi';

export const useDeleteAncillaryItem = ({ itemId }: { itemId: string }) => {
  const { api, storeId, queryClient } = useItemGraphQL();
  const { keys } = useItemApi();
  const t = useTranslation();
  const { success, error } = useNotification();

  const mutationFn = async (id: string) => {
    const apiResult = await api.deleteAncillaryItem({
      storeId,
      input: { id },
    });
    if (!isEmpty(apiResult)) {
      const result = apiResult.centralServer.ancillaryItem.deleteAncillaryItem;
      if (result.__typename === 'DeleteResponse') {
        return result;
      }
    }
    throw new Error();
  };

  const { mutateAsync } = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.detail(itemId) });
    },
  });

  const showDeleteConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-delete-ancillary-item'),
  });

  return (id: string) => {
    showDeleteConfirmation({
      onConfirm: async () => {
        try {
          await mutateAsync(id);
          success(t('messages.deleted-ancillary-item'))();
        } catch (e) {
          // Delete-button is only enabled in flows where every reachable
          // error variant is a programming/connectivity failure; surface
          // whatever the underlying layer reports.
          error(e instanceof Error && e.message ? e.message : String(e))();
        }
      },
    });
  };
};
