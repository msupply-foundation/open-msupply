import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ImmunisationsListView } from '../ListView';
import { ImmunisationDetailView } from '../DetailView';

export const ImmunisationService: FC = () => {
  const immunisationsRoute = RouteBuilder.create(
    AppRoute.Immunisations
  ).build();
  const immunisationRoute = RouteBuilder.create(AppRoute.Immunisations)
    .addPart(':id')
    .build();

  return (
    <Routes>
      <Route path={immunisationsRoute} element={<ImmunisationsListView />} />
      <Route path={immunisationRoute} element={<ImmunisationDetailView />} />
    </Routes>
  );
};

export default ImmunisationService;
