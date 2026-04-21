import {
  useMutation,
  useQueryClient,
  RefreshAncillaryItemsAction,
  useTranslation,
  useNotification,
} from '@openmsupply-client/common';
import { useRequestId } from '../document/useRequest';
import { useRequestApi } from '../utils/useRequestApi';

export const useRefreshAncillaryItems = () => {
  const requestId = useRequestId();
  const queryClient = useQueryClient();
  const api = useRequestApi();
  const t = useTranslation();
  const { success, error } = useNotification();

  const { mutateAsync, isLoading } = useMutation(api.refreshAncillaryItems, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.detail(requestId)),
  });

  const run = async (action: RefreshAncillaryItemsAction) => {
    try {
      await mutateAsync({ requisitionId: requestId, action });
      success(
        action === RefreshAncillaryItemsAction.Add
          ? t('messages.ancillary-items-added')
          : t('messages.ancillary-items-updated')
      )();
    } catch (e) {
      error(e instanceof Error ? e.message : String(e))();
    }
  };

  return { add: () => run(RefreshAncillaryItemsAction.Add), update: () => run(RefreshAncillaryItemsAction.Update), isLoading };
};
