import React, { ReactElement } from 'react';
import { DetailPanelPortal } from '@common/components';
import { SupplierDetailSection } from './SupplierDetailSection';
import { DateSection } from './DateSection';
import { OtherSection } from './OtherSection';
import { usePurchaseOrder } from '../../api/hooks/usePurchaseOrder';

export const SidePanel = (): ReactElement => {
  const {
    query: { data },
    update: { update },
  } = usePurchaseOrder();

  return (
    <DetailPanelPortal>
      <SupplierDetailSection data={data} onUpdate={update} />
      <DateSection data={data} onUpdate={update} />
      <OtherSection data={data} onUpdate={update} />
    </DetailPanelPortal>
  );
};
