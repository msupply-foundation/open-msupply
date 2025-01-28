import {
  useBreadcrumbs,
  useDeleteConfirmation,
  useMutation,
  useQueryClient,
  useTranslation,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

export const useAssetDelete = (id: string) => {
  const api = useAssetApi();
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation(async (id: string) =>
    api.delete(id, api.storeId)
  );
  const t = useTranslation('coldchain');
  const { navigateUpOne } = useBreadcrumbs();

  const deleteAction = async () =>
    mutateAsync(id)
      .then(() => {
        navigateUpOne();
        // invalidating before navigating results in a message
        // of 'asset not found'
        queryClient.invalidateQueries(api.keys.base());
      })
      .catch(err => {
        throw err;
      });

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows: [id],
    deleteAction,
    messages: {
      confirmMessage: t('messages.confirm-delete-assets', {
        count: 1,
      }),
      deleteSuccess: t('messages.deleted-assets', {
        count: 1,
      }),
    },
  });

  return confirmAndDelete;
};
