import {
  useTranslation,
  useNotification,
  useNavigate,
  useConfirmationModal,
  useAuthContext,
  UserPermission,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useOutboundDuplicate } from './useOutboundDuplicate';

interface DuplicateSource {
  id: string;
  invoiceNumber: number;
  otherPartyName: string;
}

export const useDuplicateOutbound = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { success, warning } = useNotification();
  const { userHasPermission } = useAuthContext();
  const { duplicate, isDuplicating } = useOutboundDuplicate();

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: '',
  });

  const hasMutatePermission = userHasPermission(
    UserPermission.OutboundShipmentMutate
  );

  // Opens the confirmation modal and, on confirm, duplicates the shipment,
  // shows the success/skipped-item toasts and navigates to the new shipment.
  // `onSuccess` lets the caller run side effects (e.g. clearing row selection).
  const duplicateOutbound = (
    source: DuplicateSource,
    onSuccess?: () => void
  ) => {
    getConfirmation({
      message: t('messages.confirm-duplicate-shipment-customer', {
        number: source.invoiceNumber,
        customerName: source.otherPartyName,
      }),
      onConfirm: async () => {
        const result = await duplicate(source.id);
        if (!result) return;

        const { id, invoiceNumber, skippedItemCount } = result;
        onSuccess?.();
        success(
          t('messages.shipment-copied', {
            newNumber: invoiceNumber,
            sourceNumber: source.invoiceNumber,
          })
        )();
        if (skippedItemCount > 0) {
          warning(
            t('messages.shipment-copied-skipped-items', {
              count: skippedItemCount,
            })
          )();
        }
        navigate(
          RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.OutboundShipment)
            .addPart(id)
            .build()
        );
      },
    });
  };

  return {
    duplicateOutbound,
    hasMutatePermission,
    isDuplicating,
  };
};
