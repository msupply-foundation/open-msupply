import {
  useConfirmationModal,
  useTranslation,
  useQueryClient,
  useMutation,
  useNotification,
} from '@openmsupply-client/common';
import { MasterListRowFragment } from '@openmsupply-client/system';
import { useResponseFields } from '../document/useResponseFields';
import { useResponseApi } from './useResponseApi';

export const useResponseAddFromMasterList = () => {
  const t = useTranslation();
  const { error } = useNotification();
  const queryClient = useQueryClient();
  const api = useResponseApi();
  const { id: responseId } = useResponseFields('id');
  const mutationState = useMutation(api.responseAddFromMasterList, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.detail(responseId));
    },
  });

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-add-from-master-list'),
  });

  const responseAddFromMasterList = async ({
    id: masterListId,
  }: MasterListRowFragment) => {
    getConfirmation({
      onConfirm: () =>
        mutationState.mutateAsync(
          { masterListId, responseId },
          {
            onError: e => {
              const { message } = e as Error;
              switch (message) {
                case 'MasterListNotFoundForThisStore': {
                  return error(
                    t('error.master-list-not-found-for-this-store')
                  )();
                }
                default:
                  return error(t('error.cannot-add-items-to-requisition'))();
              }
            },
          }
        ),
    });
  };

  return { ...mutationState, responseAddFromMasterList };
};
