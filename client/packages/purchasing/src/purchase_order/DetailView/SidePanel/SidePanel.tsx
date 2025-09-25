import React, { ReactElement } from 'react';
import {
  useTranslation,
  useNotification,
  DetailPanelPortal,
} from '@openmsupply-client/common';
import { usePurchaseOrder } from '../../api/hooks/usePurchaseOrder';
import { PurchaseOrderFragment } from '../../api';
import { DateSection } from './DateSection';
import { OtherSection } from './OtherSection';
import { PricingSection } from './PricingSection';
import { isPurchaseOrderDisabled } from '../../../utils';

export const SidePanel = (): ReactElement => {
  const t = useTranslation();
  const { error } = useNotification();
  const {
    update: { update },
    draft,
    handleChange,
  } = usePurchaseOrder();
  const disabled = draft ? isPurchaseOrderDisabled(draft) : false;

  const handleUpdate = async (input: Partial<PurchaseOrderFragment>) => {
    try {
      await update(input);
    } catch (e) {
      error(t('messages.error-saving-purchase-order'))();
    }
  };

  return (
    <DetailPanelPortal>
      <PricingSection
        draft={draft}
        onChange={handleChange}
        disabled={disabled}
      />
      <OtherSection
        draft={draft}
        onUpdate={handleUpdate}
        onChange={handleChange}
      />
      <DateSection draft={draft} onUpdate={handleUpdate} />
    </DetailPanelPortal>
  );
};
