import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
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
  const gotoStock = useMatch(fullItemPath);
  const gotoStocktakes = useMatch(fullStocktakePath);

  if (gotoStock) {
    return <StockService />;
  }
  if (gotoStocktakes) {
    return <InventoryService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
