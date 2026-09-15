import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ItemListView } from '../ListView';
import { ItemDetailView } from '../DetailView';

const Service: FC = () => {
  const itemsRoute = RouteBuilder.create(AppRoute.Items).build();

  const itemRoute = RouteBuilder.create(AppRoute.Items).addPart(':id').build();

  return (
    <Routes>
      <Route path={itemsRoute} element={<ItemListView />} />
      <Route path={itemRoute} element={<ItemDetailView />} />
    </Routes>
  );
};

export default Service;
