import {
  useConfirmationModal,
  useTranslation,
  useQueryClient,
  useMutation,
  useNotification,
} from '@openmsupply-client/common';
import { MasterListRowFragment } from '@openmsupply-client/system';
import { useInboundShipment } from '../document/useInboundShipment';
import { useInboundApi } from './useInboundApi';
import { INBOUND, INBOUND_LINE } from '../document/keys';

export const useAddFromMasterList = () => {
  const { error } = useNotification();
  const queryClient = useQueryClient();
  const {
    query: { data },
  } = useInboundShipment();
  const shipmentId = data?.id ?? '';
  const api = useInboundApi();
  const mutationState = useMutation({
    mutationFn: api.addFromMasterList,

    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: [INBOUND, INBOUND_LINE, shipmentId]
      })
  });

  const t = useTranslation();
  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-add-from-master-list'),
  });

  const addFromMasterList = async ({
    id: masterListId,
  }: MasterListRowFragment) => {
    getConfirmation({
      onConfirm: async () => {
        try {
          const result = await mutationState.mutateAsync(
            { masterListId, shipmentId },
            {
              onError: e => {
                const { message } = e as Error;
                switch (message) {
                  case 'CannotEditInvoice': {
                    return error(t('label.cannot-edit-invoice'))();
                  }
                  case 'RecordNotFound': {
                    return error(t('messages.record-not-found'))();
                  }
                  case 'MasterListNotFoundForThisName': {
                    return error(t('error.master-list-not-found'))();
                  }
                  default:
                    return error(t('label.cannot-add-item-to-shipment'))();
                }
              },
            }
          );

          return result;
        } catch (err) {
          // Error handling is done in the onError callback, so swallow here
        }
      },
    });
  };

  return { ...mutationState, addFromMasterList };
};
