import {
  useMutation,
  useQueryClient,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useOutboundApi } from '../utils/useOutboundApi';

export const useOutboundDuplicate = () => {
  const t = useTranslation();
  const { error } = useNotification();
  const queryClient = useQueryClient();
  const api = useOutboundApi();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: api.duplicate,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: api.keys.base(),
      }),
  });

  const duplicate = async (id: string) => {
    try {
      const duplicated = await mutateAsync(id);

      if (duplicated?.__typename === 'DuplicateOutboundShipmentNode') {
        return {
          id: duplicated.invoice.id,
          invoiceNumber: duplicated.invoice.invoiceNumber,
          skippedItemCount: duplicated.skippedItemCount,
        };
      }

      if (
        duplicated?.__typename === 'DuplicateOutboundShipmentError' &&
        duplicated.error.__typename === 'CustomerIsInactive'
      ) {
        error(t('error.duplicate-customer-inactive'))();
        return undefined;
      }

      error(t('error.failed-to-duplicate-shipment', { message: '' }))();
      return undefined;
    } catch (e) {
      error(
        t('error.failed-to-duplicate-shipment', {
          message: (e as Error).message,
        })
      )();
      return undefined;
    }
  };

  return { duplicate, isDuplicating: isPending };
};
