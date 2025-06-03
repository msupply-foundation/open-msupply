import React, { FC } from 'react';

import {
  ListView as RequestRequisitionListView,
  DetailView as RequestRequisitionDetailView,
  IndicatorEditPage as RequestRequisitionIndicatorEditPage,
} from './RequestRequisition';
import {
  ListView as ResponseRequisitionListView,
  DetailView as ResponseRequisitionDetailView,
  IndicatorEditPage as ResponseRequisitionIndicatorEditPage,
} from './ResponseRequisition';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { RnRFormDetailView, RnRFormListView } from './RnRForms';

const customerRequisitionsRoute = RouteBuilder.create(
  AppRoute.CustomerRequisition
).build();
const customerRequisitionRoute = RouteBuilder.create(
  AppRoute.CustomerRequisition
)
  .addPart(':id')
  .build();

const indicatorLineRoute = RouteBuilder.create(AppRoute.CustomerRequisition)
  .addPart(':id')
  .addPart(AppRoute.Indicators)
  .addPart(':programIndicatorCode')
  .addPart(':programIndicatorLineId')
  .build();

const requestIndicatorLineRoute = RouteBuilder.create(AppRoute.InternalOrder)
  .addPart(':id')
  .addPart(AppRoute.Indicators)
  .addPart(':programIndicatorCode')
  .addPart(':programIndicatorLineId')
  .build();

const internalOrdersRoute = RouteBuilder.create(AppRoute.InternalOrder).build();
const internalOrderRoute = RouteBuilder.create(AppRoute.InternalOrder)
  .addPart(':id')
  .build();

const rnrFormsRoute = RouteBuilder.create(AppRoute.RnRForms).build();

const rnrFormRoute = RouteBuilder.create(AppRoute.RnRForms)
  .addPart(':id')
  .build();

export const RequisitionService: FC = () => {
  return (
    <Routes>
      <Route
        path={customerRequisitionsRoute}
        element={<ResponseRequisitionListView />}
      />
      <Route
        path={customerRequisitionRoute}
        element={<ResponseRequisitionDetailView />}
      />
      <Route
        path={indicatorLineRoute}
        element={<ResponseRequisitionIndicatorEditPage />}
      />
      <Route
        path={internalOrdersRoute}
        element={<RequestRequisitionListView />}
      />
      <Route
        path={internalOrderRoute}
        element={<RequestRequisitionDetailView />}
      />
      <Route
        path={requestIndicatorLineRoute}
        element={<RequestRequisitionIndicatorEditPage />}
      />
      <Route path={rnrFormsRoute} element={<RnRFormListView />} />
      <Route path={rnrFormRoute} element={<RnRFormDetailView />} />
    </Routes>
  );
};

export default RequisitionService;
