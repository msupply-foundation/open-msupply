import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
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

const fullInboundReturnPath = RouteBuilder.create(AppRoute.Distribution)
  .addPart(AppRoute.InboundReturn)
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
  const gotoOutboundShipment = useMatch(fullOutboundShipmentPath);
  const gotoCustomerRequisition = useMatch(fullCustomerRequisitionPath);
  const gotoCustomers = useMatch(fullCustomersPath);
  const goToInboundReturn = useMatch(fullInboundReturnPath);

  if (gotoOutboundShipment || goToInboundReturn) {
    return <InvoiceService />;
  }
  if (gotoCustomerRequisition) {
    return <RequisitionService />;
  }

  if (gotoCustomers) {
    return <NameService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
