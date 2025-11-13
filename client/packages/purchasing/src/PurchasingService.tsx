import React from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

import { PurchaseOrderListView } from './purchase_order/ListView/ListView';
import { PurchaseOrderDetailView } from './purchase_order/DetailView';
import { GoodsReceivedListView } from './goods_received/ListView';
import { GoodsReceivedDetailView } from './goods_received/DetailView';
import { OutstandingLinesListView } from './purchase_order/ListView/OutstandingLines/OutstandingLines';

const PurchasingService = () => {
  const purchaseOrdersRoute = RouteBuilder.create(
    AppRoute.PurchaseOrder
  ).build();

  const purchaseOrderRoute = RouteBuilder.create(AppRoute.PurchaseOrder)
    .addPart(':purchaseOrderId')
    .build();

  const outstandingPurchaseOrderLinesRoute = RouteBuilder.create(
    AppRoute.PurchaseOrder
  )
    .addPart(AppRoute.PurchaseOrderOutstandingLines)
    .build();

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
      <Route
        path={outstandingPurchaseOrderLinesRoute}
        element={<OutstandingLinesListView />}
      />
      <Route path={goodsReceivedRoute} element={<GoodsReceivedListView />} />
      <Route
        path={goodsReceivedDetailRoute}
        element={<GoodsReceivedDetailView />}
      />
    </Routes>
  );
};

export default PurchasingService;
