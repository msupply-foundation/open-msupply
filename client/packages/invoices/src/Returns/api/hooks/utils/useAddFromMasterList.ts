import {
  useConfirmationModal,
  useTranslation,
  useQueryClient,
  useMutation,
  useNotification,
} from '@openmsupply-client/common';
import { MasterListRowFragment } from '@openmsupply-client/system';
import { useOutboundFields } from '../document/useOutboundFields';
import { useOutboundApi } from './useOutboundApi';

export const useAddFromMasterList = () => {
  const { error } = useNotification();
  const queryClient = useQueryClient();
  const { id: shipmentId, invoiceNumber } = useOutboundFields([
    'id',
    'invoiceNumber',
  ]);
  const api = useOutboundApi();
  const mutationState = useMutation(api.addFromMasterList, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(String(invoiceNumber))),
  });

  const t = useTranslation('distribution');
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
          { masterListId, shipmentId },
          {
            onError: e => {
              const { message } = e as Error;
              switch (message) {
                case 'CannotEditInvoice': {
                  return error('Cannot edit shipment')();
                }
                case 'RecordNotFound': {
                  return error('This master list has been deleted!')();
                }
                case 'MasterListNotFoundForThisName': {
                  return error(
                    "Uh oh this is not the master list you're looking for"
                  )();
                }
                default:
                  return error('Could not add items to shipment')();
              }
            },
          }
        ),
    });
  };

  return { ...mutationState, addFromMasterList };
};
