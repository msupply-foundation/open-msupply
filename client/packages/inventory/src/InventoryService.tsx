import React, { FC } from 'react';
import {
  ListView as StocktakeListView,
  DetailView as StocktakeDetailView,
} from './Stocktake';

import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const stocktakesRoute = RouteBuilder.create(AppRoute.Stocktakes).build();
const stocktakeRoute = RouteBuilder.create(AppRoute.Stocktakes)
  .addPart(':stocktakeNumber')
  .build();

export const InventoryService: FC = () => {
  return (
    <Routes>
      <Route path={stocktakesRoute} element={<StocktakeListView />} />
      <Route path={stocktakeRoute} element={<StocktakeDetailView />} />
    </Routes>
  );
};

export default InventoryService;
