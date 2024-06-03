import React, { FC } from 'react';
import {
  RouteBuilder,
  Routes,
  Route,
  NothingHere,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ImmunisationsListView } from '../ListView';
import { ImmunisationDetailView } from '../DetailView';
import { Environment } from '@openmsupply-client/config';

export const ImmunisationService: FC = () => {
  const immunisationsRoute = RouteBuilder.create(
    AppRoute.Immunisations
  ).build();
  const immunisationRoute = RouteBuilder.create(AppRoute.Immunisations)
    .addPart(':id')
    .build();
  if (!Environment.FEATURE_IMMUNISATIONS) {
    return <NothingHere />;
  }

  return (
    <Routes>
      <Route path={immunisationsRoute} element={<ImmunisationsListView />} />
      <Route path={immunisationRoute} element={<ImmunisationDetailView />} />
    </Routes>
  );
};

export default ImmunisationService;
