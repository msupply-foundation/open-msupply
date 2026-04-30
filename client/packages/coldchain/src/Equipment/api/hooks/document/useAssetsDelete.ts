import {
  useDeleteConfirmation,
  useMutation,
  useQueryClient,
  useTranslation,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';
import { AssetRowFragment } from '../../operations.generated';

export const useAssetsDelete = (
  selectedRows: AssetRowFragment[],
  resetSelection: () => void
) => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const api = useAssetApi();
  const { mutateAsync } = useMutation(async (id: string) =>
    api.delete(id, api.storeId)
  );

  const deleteAction = async () => {
    await Promise.all(selectedRows.map(row => mutateAsync(row.id)))
      .then(() => queryClient.invalidateQueries(api.keys.base()))
      .catch(err => {
        throw err;
      });
    resetSelection();
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    messages: {
      confirmMessage: t('messages.confirm-delete-assets', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-assets', {
        count: selectedRows.length,
      }),
    },
  });

  return { confirmAndDelete };
};
