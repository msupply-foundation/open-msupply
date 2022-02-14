import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
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

const MasterListService = React.lazy(
  () => import('@openmsupply-client/system/src/MasterList/Service/Service')
);

const fullItemPath = RouteBuilder.create(AppRoute.Inventory)
  .addPart(AppRoute.Stock)
  .addWildCard()
  .build();

const fullStocktakePath = RouteBuilder.create(AppRoute.Inventory)
  .addPart(AppRoute.Stocktakes)
  .addWildCard()
  .build();

const fullLocationPath = RouteBuilder.create(AppRoute.Inventory)
  .addPart(AppRoute.Locations)
  .build();

const fullMasterListPath = RouteBuilder.create(AppRoute.Inventory)
  .addPart(AppRoute.MasterLists)
  .addWildCard()
  .build();

export const InventoryRouter: FC = () => {
  const gotoStock = useMatch(fullItemPath);
  const gotoStocktakes = useMatch(fullStocktakePath);
  const gotoLocations = useMatch(fullLocationPath);
  const gotoMasterLists = useMatch(fullMasterListPath);

  if (gotoStock) {
    return <StockService />;
  }

  if (gotoStocktakes) {
    return <InventoryService />;
  }

  if (gotoLocations) {
    return <LocationService />;
  }
  if (gotoMasterLists) {
    return <MasterListService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
