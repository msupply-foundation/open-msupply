import React from 'react';
import { useParams } from '@openmsupply-client/common';
import { usePurchaseOrder } from '../api/hooks/usePurchaseOrder';

export const PurchaseOrderDetailView = () => {
  const { purchaseOrderId = '' } = useParams();
  const {
    query: { data },
  } = usePurchaseOrder(purchaseOrderId);

  return <p>Purchase order to: {data?.supplier?.name}</p>;
};
