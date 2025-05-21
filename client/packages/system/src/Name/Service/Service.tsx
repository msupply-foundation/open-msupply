import React from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { NameListView } from '../ListView';
import { StoresListView } from '../ListView/Stores/ListView';

export const Service = () => {
  const customersRoute = RouteBuilder.create(AppRoute.Customer).build();
  const suppliersRoute = RouteBuilder.create(AppRoute.Suppliers).build();
  const storesRoute = RouteBuilder.create(AppRoute.Stores).build();

  return (
    <Routes>
      <Route path={customersRoute} element={<NameListView type="customer" />} />
      <Route path={suppliersRoute} element={<NameListView type="supplier" />} />
      <Route path={storesRoute} element={<StoresListView />} />
    </Routes>
  );
};

export default Service;
