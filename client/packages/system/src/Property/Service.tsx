import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { PropertyListView } from './ListView';
import { PropertyDetailView } from './DetailView';

export const PropertyService: FC = () => {
  const listRoute = RouteBuilder.create(AppRoute.Properties).build();
  const detailRoute = RouteBuilder.create(AppRoute.Properties)
    .addPart(':id')
    .build();

  return (
    <Routes>
      <Route path={listRoute} element={<PropertyListView />} />
      <Route path={detailRoute} element={<PropertyDetailView />} />
    </Routes>
  );
};

export default PropertyService;
