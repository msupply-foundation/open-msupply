import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ListView } from '../ListView';

const Service: FC = () => {
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

export default Service;
