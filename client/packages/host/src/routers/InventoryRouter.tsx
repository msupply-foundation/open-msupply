import React, { FC } from 'react';
import { Navigate, useMatch } from 'react-router-dom';
import { RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const StockService = React.lazy(
  () => import('@openmsupply-client/system/src/Stock/Service/Service')
);

const InventoryService = React.lazy(
  () => import('@openmsupply-client/inventory/src/InventoryService')
);

const fullItemPath = RouteBuilder.create(AppRoute.Inventory)
  .addPart(AppRoute.Stock)
  .addWildCard()
  .build();

const fullStocktakePath = RouteBuilder.create(AppRoute.Inventory)
  .addPart(AppRoute.Stocktake)
  .addWildCard()
  .build();

export const InventoryRouter: FC = () => {
  if (useMatch(fullItemPath)) {
    return <StockService />;
  }
  if (useMatch(fullStocktakePath)) {
    return <InventoryService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
