import React, { FC } from 'react';
import { Routes, Route } from 'react-router-dom';

import { RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ListView } from '../ListView';

const Service: FC = () => {
  const customersRoute = RouteBuilder.create(AppRoute.Customer).build();

  const customerRoute = RouteBuilder.create(AppRoute.Customer)
    .addPart(':id')
    .build();

  return (
    <Routes>
      <Route path={customersRoute} element={<ListView />} />
      <Route path={customerRoute} element={<ListView />} />
    </Routes>
  );
};

export default Service;
