import React, { FC } from 'react';
import { Routes, Route } from 'react-router-dom';

import { RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ListView } from '../ListView';

const InvoiceService: FC = () => {
  const itemsRoute = RouteBuilder.create(AppRoute.Items).build();

  const itemRoute = RouteBuilder.create(AppRoute.OutboundShipment)
    .addPart(':id')
    .build();

  return (
    <Routes>
      <Route path={itemsRoute} element={<ListView />} />
      <Route path={itemRoute} element={<ListView />} />
    </Routes>
  );
};

export default InvoiceService;
