import { LocaleKey, useTranslation } from '@common/intl';
import { PurchaseOrderNodeStatus } from '@common/types';
import { PurchaseOrderFragment } from './api';

const statusTranslation: Record<PurchaseOrderNodeStatus, LocaleKey> = {
  NEW: 'label.new',
  AUTHORISED: 'label.authorized',
  CONFIRMED: 'label.confirmed',
  FINALISED: 'label.finalised',
};

export const getStatusTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: PurchaseOrderNodeStatus): string => {
    return t(
      statusTranslation[currentStatus] ??
        statusTranslation[PurchaseOrderNodeStatus.New]
    );
  };
export const isPurchaseOrderDisabled = (purchaseOrder: PurchaseOrderFragment): boolean => {
  return (
    purchaseOrder.status === PurchaseOrderNodeStatus.Finalised
  );
}