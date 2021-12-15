import React, { FC } from 'react';

import {
  ListView as SupplierRequisitionListView,
  DetailView as SupplierRequisitionDetailView,
} from './SupplierRequisition';
import {
  ListView as CustomerRequisitionListView,
  DetailView as CustomerRequisitionDetailView,
} from './CustomerRequisition';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const customerRequisitionsRoute = RouteBuilder.create(
  AppRoute.CustomerRequisition
).build();
const customerRequisitionRoute = RouteBuilder.create(
  AppRoute.CustomerRequisition
)
  .addPart(':id')
  .build();

const supplierRequisitionsRoute = RouteBuilder.create(
  AppRoute.SupplierRequisition
).build();
const supplierRequisitionRoute = RouteBuilder.create(
  AppRoute.SupplierRequisition
)
  .addPart(':id')
  .build();

export const RequisitionService: FC = () => {
  return (
    <Routes>
      <Route
        path={customerRequisitionsRoute}
        element={<CustomerRequisitionListView />}
      />
      <Route
        path={customerRequisitionRoute}
        element={<CustomerRequisitionDetailView />}
      />
      <Route
        path={supplierRequisitionsRoute}
        element={<SupplierRequisitionListView />}
      />
      <Route
        path={supplierRequisitionRoute}
        element={<SupplierRequisitionDetailView />}
      />
    </Routes>
  );
};

export default RequisitionService;
