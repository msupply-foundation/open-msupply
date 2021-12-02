import React, { FC } from 'react';
import { Navigate, useMatch } from 'react-router-dom';
import { RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const InvoiceService = React.lazy(
  () => import('@openmsupply-client/invoices/src/InvoiceService')
);

const NameService = React.lazy(
  () => import('@openmsupply-client/system/src/Name/Service')
);

const RequisitionService = React.lazy(
  () => import('@openmsupply-client/requisitions/src/RequisitionService')
);

const fullOutboundShipmentPath = RouteBuilder.create(AppRoute.Distribution)
  .addPart(AppRoute.OutboundShipment)
  .addWildCard()
  .build();

const fullCustomerRequisitionPath = RouteBuilder.create(AppRoute.Distribution)
  .addPart(AppRoute.CustomerRequisition)
  .addWildCard()
  .build();

const fullCustomersPath = RouteBuilder.create(AppRoute.Distribution)
  .addPart(AppRoute.Customer)
  .addWildCard()
  .build();

export const DistributionRouter: FC = () => {
  if (useMatch(fullOutboundShipmentPath)) {
    return <InvoiceService />;
  }
  if (useMatch(fullCustomerRequisitionPath)) {
    return <RequisitionService />;
  }

  if (useMatch(fullCustomersPath)) {
    return <NameService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
