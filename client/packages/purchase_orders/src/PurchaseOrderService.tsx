import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { PurchaseOrderListView } from './ListView/ListView';
import { PurchaseOrderDetailView } from './DetailView';

const PurchaseOrderService: FC = () => {
  const purchaseOrdersRoute = RouteBuilder.create(
    AppRoute.PurchaseOrder
  ).build();

  const purchaseOrderRoute = RouteBuilder.create(AppRoute.PurchaseOrder)
    .addPart(':purchaseOrderId')
    .build();

  return (
    <Routes>
      <Route path={purchaseOrdersRoute} element={<PurchaseOrderListView />} />
      <Route path={purchaseOrderRoute} element={<PurchaseOrderDetailView />} />
    </Routes>
  );
};

export default PurchaseOrderService;
