import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { StockListView } from '../ListView';
import { StockLineDetailView } from '../DetailView';

const Service: FC = () => {
  const stockListRoute = RouteBuilder.create(AppRoute.Stock).build();
  const stockLineRoute = RouteBuilder.create(AppRoute.Stock)
    .addPart(':id')
    .build();
  return (
    <Routes>
      <Route path={stockListRoute} element={<StockListView />} />
      <Route path={stockLineRoute} element={<StockLineDetailView />} />
    </Routes>
  );
};

export default Service;
