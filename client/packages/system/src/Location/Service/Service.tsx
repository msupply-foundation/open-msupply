import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { LocationListView } from '../ListView';

const LocationService: FC = () => {
  const locationsRoute = RouteBuilder.create(AppRoute.Locations).build();

  return (
    <Routes>
      <Route path={locationsRoute} element={<LocationListView />} />
    </Routes>
  );
};

export default LocationService;
