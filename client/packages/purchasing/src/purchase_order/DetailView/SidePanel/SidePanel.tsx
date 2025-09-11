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
import { PricingSection } from './PricingSection';

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
      <PricingSection draft={draft} />
      <SupplierDetailSection draft={draft} onChange={handleChange} />
      <OtherSection
        draft={draft}
        onUpdate={handleUpdate}
        onChange={handleChange}
      />
      <DateSection draft={draft} onUpdate={handleUpdate} />
    </DetailPanelPortal>
  );
};
