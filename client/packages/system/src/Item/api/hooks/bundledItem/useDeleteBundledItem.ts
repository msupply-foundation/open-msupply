import {
  isEmpty,
  useMutation,
  useTranslation,
  useNotification,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useItemApi, useItemGraphQL } from '../useItemApi';

export const useDeleteBundledItem = ({ itemId }: { itemId: string }) => {
  const { api, storeId, queryClient } = useItemGraphQL();
  const { keys } = useItemApi();
  const t = useTranslation();
  const { success } = useNotification();

  const mutationFn = async (id: string) => {
    const apiResult = await api.deleteItemVariant({
      storeId,
      input: { id },
    });
    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.centralServer.itemVariant.deleteItemVariant;
      if (result.__typename === 'DeleteResponse') {
        return result;
      }
    }
    throw new Error(t('error.failed-to-delete-item-variant'));
  };

  const { mutateAsync } = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries(keys.detail(itemId));
    },
  });

  const showDeleteConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-delete-item-variant'),
  });

  return (id: string) => {
    showDeleteConfirmation({
      onConfirm: async () => {
        await mutateAsync(id);
        success(t('messages.deleted-item-variant'))();
      },
    });
  };
};
