import React, { FC } from 'react';
import {
  ListView as StocktakeListView,
  DetailView as StocktakeDetailView,
} from './Stocktake';
import {
  ListView as StockMovementListView,
  DetailView as StockMovementDetailView,
} from './StockMovement';

import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const stocktakesRoute = RouteBuilder.create(AppRoute.Stocktakes).build();
const stocktakeRoute = RouteBuilder.create(AppRoute.Stocktakes)
  .addPart(':id')
  .build();

const stockMovementsRoute = RouteBuilder.create(AppRoute.StockMovement).build();
const stockMovementRoute = RouteBuilder.create(AppRoute.StockMovement)
  .addPart(':id')
  .build();

export const InventoryService: FC = () => {
  return (
    <Routes>
      <Route path={stocktakesRoute} element={<StocktakeListView />} />
      <Route path={stocktakeRoute} element={<StocktakeDetailView />} />
      <Route path={stockMovementsRoute} element={<StockMovementListView />} />
      <Route path={stockMovementRoute} element={<StockMovementDetailView />} />
    </Routes>
  );
};

export default InventoryService;
