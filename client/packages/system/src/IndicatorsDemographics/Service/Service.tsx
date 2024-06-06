import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { IndicatorsDemographics } from '../DetailView/IndicatorsDemographics';

export const IndicatorsDemographicsService: FC = () => {
  const indicatorsDemographicsRoute = RouteBuilder.create(
    AppRoute.IndicatorsDemographics
  ).build();

  return (
    <Routes>
      <Route
        path={indicatorsDemographicsRoute}
        element={<IndicatorsDemographics />}
      />
    </Routes>
  );
};

export default IndicatorsDemographicsService;
