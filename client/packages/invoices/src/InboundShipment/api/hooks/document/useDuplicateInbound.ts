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
import { useDuplicate } from './useInboundList';

interface DuplicateSource {
  id: string;
  invoiceNumber: number;
  otherPartyName: string;
}

export const useDuplicateInbound = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { success, warning } = useNotification();
  const { userHasPermission } = useAuthContext();
  const { duplicate, isDuplicating, duplicateError } = useDuplicate();

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: '',
  });

  const hasMutatePermission = (isExternal: boolean) =>
    isExternal
      ? userHasPermission(UserPermission.InboundShipmentExternalMutate)
      : userHasPermission(UserPermission.InboundShipmentMutate);

  // Opens the confirmation modal and, on confirm, duplicates the shipment,
  // shows the success/skipped-item toasts and navigates to the new shipment.
  // `onSuccess` lets the caller run side effects (e.g. clearing row selection).
  const duplicateInbound = (source: DuplicateSource, onSuccess?: () => void) => {
    getConfirmation({
      message: t('messages.confirm-duplicate-shipment', {
        number: source.invoiceNumber,
        supplierName: source.otherPartyName,
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
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InboundShipment)
            .addPart(id)
            .build()
        );
      },
    });
  };

  return {
    duplicateInbound,
    hasMutatePermission,
    isDuplicating,
    duplicateError,
  };
};
