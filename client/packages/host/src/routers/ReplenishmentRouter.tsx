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

const fullInboundShipmentPath = RouteBuilder.create(AppRoute.Replenishment)
  .addPart(AppRoute.InboundShipment)
  .addWildCard()
  .build();

const fullInternalOrderPath = RouteBuilder.create(AppRoute.Replenishment)
  .addPart(AppRoute.InternalOrder)
  .addWildCard()
  .build();

const fullOutboundReturnsPath = RouteBuilder.create(AppRoute.Replenishment)
  .addPart(AppRoute.OutboundReturn)
  .addWildCard()
  .build();

const fullRnRPath = RouteBuilder.create(AppRoute.Replenishment)
  .addPart(AppRoute.RnRForms)
  .addWildCard()
  .build();

const fullSuppliersPath = RouteBuilder.create(AppRoute.Replenishment)
  .addPart(AppRoute.Suppliers)
  .addWildCard()
  .build();

export const ReplenishmentRouter: FC = () => {
  const gotoRequisition =
    useMatch(fullInternalOrderPath) || useMatch(fullRnRPath);
  const gotoSuppliers = useMatch(fullSuppliersPath);
  const gotoInboundShipment = useMatch(fullInboundShipmentPath);
  const gotoReturns = useMatch(fullOutboundReturnsPath);

  if (gotoRequisition) {
    return <RequisitionService />;
  }

  if (gotoSuppliers) {
    return <NameService />;
  }

  if (gotoInboundShipment || gotoReturns) {
    return <InvoiceService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
