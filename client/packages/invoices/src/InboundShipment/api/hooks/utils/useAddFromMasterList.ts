import {
  useConfirmationModal,
  useTranslation,
  useQueryClient,
  useMutation,
  useNotification,
} from '@openmsupply-client/common';
import { MasterListRowFragment } from '@openmsupply-client/system';
import { useInboundFields } from '../document/useInboundFields';
import { useInboundApi } from './useInboundApi';

export const useAddFromMasterList = () => {
  const { error } = useNotification();
  const queryClient = useQueryClient();
  const { id: shipmentId, invoiceNumber } = useInboundFields([
    'id',
    'invoiceNumber',
  ]);
  const api = useInboundApi();
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
        mutationState.mutate(
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
