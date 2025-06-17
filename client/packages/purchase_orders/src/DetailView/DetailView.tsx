import React from 'react';
import { useParams } from '@openmsupply-client/common';
import { usePurchaseOrder } from '../api/hooks/usePurchaseOrder';

export const PurchaseOrderDetailView = () => {
  const { invoiceId = '' } = useParams();
  const {
    query: { data },
  } = usePurchaseOrder(invoiceId);

  return <p>Purchase order to: {data?.supplier?.name}</p>;
};
