import React, { ReactElement } from 'react';
import {
  useTranslation,
  useNotification,
  DetailPanelPortal,
} from '@openmsupply-client/common';
import {
  UpdatePurchaseOrderInput,
  usePurchaseOrder,
} from '../../api/hooks/usePurchaseOrder';
import { SupplierDetailSection } from './SupplierDetailSection';
import { DateSection } from './DateSection';
import { OtherSection } from './OtherSection';

export const SidePanel = (): ReactElement => {
  const t = useTranslation();
  const { error } = useNotification();
  const {
    query: { data },
    update: { update },
  } = usePurchaseOrder();

  const handleUpdate = (input: Partial<UpdatePurchaseOrderInput>) => {
    try {
      update(input);
    } catch (e) {
      error(t('messages.error-saving-purchase-order'))();
    }
  };

  return (
    <DetailPanelPortal>
      <SupplierDetailSection data={data} onUpdate={handleUpdate} />
      <DateSection data={data} onUpdate={handleUpdate} />
      <OtherSection data={data} onUpdate={handleUpdate} />
    </DetailPanelPortal>
  );
};
