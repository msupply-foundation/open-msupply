import {
  useConfirmationModal,
  useTranslation,
  useQueryClient,
  useMutation,
  useNotification,
} from '@openmsupply-client/common';
import { MasterListRowFragment } from '@openmsupply-client/system';
import { useRequestFields } from '../document/useRequestFields';
import { useRequestApi } from './useRequestApi';

export const useAddFromMasterList = () => {
  const { error } = useNotification();
  const queryClient = useQueryClient();
  const { id: requestId, requisitionNumber } = useRequestFields([
    'id',
    'requisitionNumber',
  ]);
  const api = useRequestApi();
  const mutationState = useMutation(api.addFromMasterList, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(String(requisitionNumber))),
  });

  const t = useTranslation('replenishment');
  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-add-from-master-list'),
  });

  const addFromMasterList = async ({
    id: masterListId,
  }: MasterListRowFragment) => {
    getConfirmation({
      onConfirm: () =>
        mutationState.mutateAsync(
          { masterListId, requestId },
          {
            onError: e => {
              const { message } = e as Error;
              switch (message) {
                case 'CannotEditRequisition': {
                  return error('Cannot edit requisition')();
                }
                case 'RecordNotFound': {
                  return error('This master list has been deleted!')();
                }
                case 'MasterListNotFoundForThisStore': {
                  return error(
                    "Uh oh this is not the master list you're looking for"
                  )();
                }
                default:
                  return error('Could not add items to requisition')();
              }
            },
          }
        ),
    });
  };

  return { ...mutationState, addFromMasterList };
};
