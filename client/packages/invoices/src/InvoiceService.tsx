import React, { FC } from 'react';
import { Routes, Route } from 'react-router-dom';

import { RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import {
  OutboundShipmentDetailView,
  OutboundShipmentListView,
} from './OutboundShipment';

const InvoiceService: FC = () => {
  const customerInvoicesRoute = RouteBuilder.create(
    AppRoute.CustomerInvoice
  ).build();

  const customerInvoiceRoute = RouteBuilder.create(AppRoute.CustomerInvoice)
    .addPart(':id')
    .build();

  return (
    <Routes>
      <Route
        path={customerInvoicesRoute}
        element={<OutboundShipmentListView />}
      />
      <Route
        path={customerInvoiceRoute}
        element={<OutboundShipmentDetailView />}
      />
    </Routes>
  );
};

export default InvoiceService;
