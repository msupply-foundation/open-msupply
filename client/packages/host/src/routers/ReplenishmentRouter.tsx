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

const fullOutboundShipmentPath = RouteBuilder.create(AppRoute.Replenishment)
  .addPart(AppRoute.InboundShipment)
  .addWildCard()
  .build();

const fullInboundShipmentPath = RouteBuilder.create(AppRoute.Replenishment)
  .addPart(AppRoute.InboundShipment)
  .addWildCard()
  .build();

const fullSupplierRequisitionPath = RouteBuilder.create(AppRoute.Replenishment)
  .addPart(AppRoute.SupplierRequisition)
  .addWildCard()
  .build();

const fullSuppliersPath = RouteBuilder.create(AppRoute.Replenishment)
  .addPart(AppRoute.Suppliers)
  .addWildCard()
  .build();

export const ReplenishmentRouter: FC = () => {
  if (useMatch(fullOutboundShipmentPath)) {
    return <InvoiceService />;
  }
  if (useMatch(fullSupplierRequisitionPath)) {
    return <RequisitionService />;
  }

  if (useMatch(fullSuppliersPath)) {
    return <NameService />;
  }

  if (useMatch(fullInboundShipmentPath)) {
    return <InvoiceService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
