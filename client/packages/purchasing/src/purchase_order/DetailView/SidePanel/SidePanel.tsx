import React, { ReactElement } from 'react';
import {
  useTranslation,
  useNotification,
  DetailPanelPortal,
} from '@openmsupply-client/common';
import { usePurchaseOrder } from '../../api/hooks/usePurchaseOrder';
import { SupplierDetailSection } from './SupplierDetailSection';
import { PurchaseOrderFragment } from '../../api';
import { DateSection } from './DateSection';
import { OtherSection } from './OtherSection';
import { PriceSection } from './PriceSection';

export const SidePanel = (): ReactElement => {
  const t = useTranslation();
  const { error } = useNotification();
  const {
    update: { update },
    draft,
    handleChange,
  } = usePurchaseOrder();

  const handleUpdate = async (input: Partial<PurchaseOrderFragment>) => {
    try {
      await update(input);
    } catch (e) {
      error(t('messages.error-saving-purchase-order'))();
    }
  };

  return (
    <DetailPanelPortal>
      <SupplierDetailSection draft={draft} onChange={handleChange} />
      <DateSection draft={draft} onUpdate={handleUpdate} />
      <OtherSection
        draft={draft}
        onUpdate={handleUpdate}
        onChange={handleChange}
      />
      <PriceSection lines={draft?.lines?.nodes ?? []} />
    </DetailPanelPortal>
  );
};
