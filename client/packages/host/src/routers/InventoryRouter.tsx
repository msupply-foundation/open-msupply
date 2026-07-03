import React, { FC } from 'react';
import {
  RouteBuilder,
  Navigate,
  useMatch,
  useFeatureFlags,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const StockService = React.lazy(
  () => import('@openmsupply-client/system/src/Stock/Service/Service')
);

const InventoryService = React.lazy(
  () => import('@openmsupply-client/inventory/src/InventoryService')
);

const LocationService = React.lazy(
  () => import('@openmsupply-client/system/src/Location/Service/Service')
);

const fullItemPath = RouteBuilder.create(AppRoute.Inventory)
  .addPart(AppRoute.Stock)
  .addWildCard()
  .build();

const fullStocktakePath = RouteBuilder.create(AppRoute.Inventory)
  .addPart(AppRoute.Stocktakes)
  .addWildCard()
  .build();

const fullStockMovementPath = RouteBuilder.create(AppRoute.Inventory)
  .addPart(AppRoute.StockMovement)
  .addWildCard()
  .build();

const fullLocationPath = RouteBuilder.create(AppRoute.Inventory)
  .addPart(AppRoute.Locations)
  .build();

export const InventoryRouter: FC = () => {
  const gotoStock = useMatch(fullItemPath);
  const gotoStocktakes = useMatch(fullStocktakePath);
  const gotoStockMovement = useMatch(fullStockMovementPath);
  const gotoLocations = useMatch(fullLocationPath);
  const { stockMovement } = useFeatureFlags();

  if (gotoStock) {
    return <StockService />;
  }

  if (gotoStocktakes) {
    return <InventoryService />;
  }

  if (stockMovement && gotoStockMovement) {
    return <InventoryService />;
  }

  if (gotoLocations) {
    return <LocationService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
