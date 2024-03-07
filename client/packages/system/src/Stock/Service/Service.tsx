import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { StockListView } from '../ListView';

const Service: FC = () => {
  const stockRoute = RouteBuilder.create(AppRoute.Stock).build();
  return (
    <Routes>
      <Route path={stockRoute} element={<StockListView />} />
    </Routes>
  );
};

export default Service;
