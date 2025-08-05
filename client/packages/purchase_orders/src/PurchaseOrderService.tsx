import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { PurchaseOrderListView } from './ListView/ListView';
import { PurchaseOrderDetailView } from './DetailView';

// --- New Goods Received placeholder components ---
const GoodsReceivedListView: FC = () => (
  <div>Goods Received List View (to be implemented)</div>
);

const GoodsReceivedDetailView: FC = () => (
  <div>Goods Received Detail View (to be implemented)</div>
);
// ------------------------------------------------

const PurchaseOrderService: FC = () => {
  const purchaseOrdersRoute = RouteBuilder.create(
    AppRoute.PurchaseOrder
  ).build();

  const purchaseOrderRoute = RouteBuilder.create(AppRoute.PurchaseOrder)
    .addPart(':purchaseOrderId')
    .build();

  // New routes for Goods Received
  const goodsReceivedRoute = RouteBuilder.create(
    AppRoute.GoodsReceived
  ).build();

  const goodsReceivedDetailRoute = RouteBuilder.create(AppRoute.GoodsReceived)
    .addPart(':goodsReceivedId')
    .build();

  return (
    <Routes>
      <Route path={purchaseOrdersRoute} element={<PurchaseOrderListView />} />
      <Route path={purchaseOrderRoute} element={<PurchaseOrderDetailView />} />
      {/* New Goods Received routes */}
      <Route path={goodsReceivedRoute} element={<GoodsReceivedListView />} />
      <Route
        path={goodsReceivedDetailRoute}
        element={<GoodsReceivedDetailView />}
      />
    </Routes>
  );
};

export default PurchaseOrderService;
