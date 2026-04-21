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
  const { success } = useNotification();

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
    throw new Error(t('error.failed-to-delete-ancillary-item'));
  };

  const { mutateAsync } = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries(keys.detail(itemId));
    },
  });

  const showDeleteConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-delete-ancillary-item'),
  });

  return (id: string) => {
    showDeleteConfirmation({
      onConfirm: async () => {
        await mutateAsync(id);
        success(t('messages.deleted-ancillary-item'))();
      },
    });
  };
};
