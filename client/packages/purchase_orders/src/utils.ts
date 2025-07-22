import { LocaleKey, useTranslation } from '@common/intl';
import { PurchaseOrderNodeStatus } from '@common/types';

const statusTranslation: Record<PurchaseOrderNodeStatus, LocaleKey> = {
  NEW: 'label.new',
  AUTHORISED: 'label.authorised',
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
