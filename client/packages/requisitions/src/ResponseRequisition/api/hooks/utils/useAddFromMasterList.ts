import {
  useConfirmationModal,
  useTranslation,
  useQueryClient,
  useMutation,
} from '@openmsupply-client/common';
import { MasterListRowFragment } from '@openmsupply-client/system';
import { useResponseFields } from '../document/useResponseFields';
import { useResponseApi } from './useResponseApi';

export const useResponseAddFromMasterList = () => {
  const t = useTranslation();
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
      onConfirm: () => mutationState.mutateAsync({ masterListId, responseId }),
    });
  };

  return { ...mutationState, responseAddFromMasterList };
};
