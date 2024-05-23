import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { NameListView } from '../ListView';
import { FacilitiesListView } from '../ListView/FacilitiesListView';

export const Service: FC = () => {
  const customersRoute = RouteBuilder.create(AppRoute.Customer).build();
  const suppliersRoute = RouteBuilder.create(AppRoute.Suppliers).build();
  const facilitiesRoute = RouteBuilder.create(AppRoute.Facilities).build();

  return (
    <Routes>
      <Route path={customersRoute} element={<NameListView type="customer" />} />
      <Route path={suppliersRoute} element={<NameListView type="supplier" />} />
      <Route path={facilitiesRoute} element={<FacilitiesListView />} />
    </Routes>
  );
};

export default Service;
