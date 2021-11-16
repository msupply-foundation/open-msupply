import React, { FC } from 'react';
import { Navigate, useMatch } from 'react-router-dom';
import { RouteBuilder, Typography } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const InvoiceService = React.lazy(
  () => import('@openmsupply-client/invoices/src/InvoiceService')
);

const CustomerService = React.lazy(
  () => import('@openmsupply-client/system/src/Name')
);

const RequisitionService: React.FC = () => (
  <Typography style={{ margin: 25 }}>coming soon..</Typography>
);

const fullOutboundShipmentPath = RouteBuilder.create(AppRoute.Distribution)
  .addPart(AppRoute.OutboundShipment)
  .addWildCard()
  .build();

const fullInboundShipmentPath = RouteBuilder.create(AppRoute.Distribution)
  .addPart(AppRoute.InboundShipment)
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

const DistributionContainer: FC = () => {
  if (useMatch(fullOutboundShipmentPath)) {
    return <InvoiceService />;
  }
  if (useMatch(fullCustomerRequisitionPath)) {
    return <RequisitionService />;
  }

  if (useMatch(fullCustomersPath)) {
    return <CustomerService />;
  }

  if (useMatch(fullInboundShipmentPath)) {
    return <InvoiceService />;
  }
  if (!useMatch(AppRoute.Distribution)) {
    const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
    return <Navigate to={notFoundRoute} />;
  }

  return <></>;
};

export default DistributionContainer;
