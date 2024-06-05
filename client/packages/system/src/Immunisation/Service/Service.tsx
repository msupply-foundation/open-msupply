import React, { FC } from 'react';
import {
  RouteBuilder,
  Routes,
  Route,
  NothingHere,
} from '@openmsupply-client/common';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { ProgramListView } from '../ListView';
import { ProgramView } from '../ProgramView';
import { ImmunisationDetailView } from '../DetailView';

export const ImmunisationService: FC = () => {
  const immunisationsRoute = RouteBuilder.create(
    AppRoute.Immunisations
  ).build();
  const immunisationRoute = RouteBuilder.create(AppRoute.Immunisations)
    .addPart(':id')
    .build();
  const immunisationDetailRoute = RouteBuilder.create(AppRoute.Immunisations)
    .addPart(':id')
    .addPart(':id')
    .build();

  if (!Environment.FEATURE_GAPS) {
    return <NothingHere />;
  }
  return (
    <Routes>
      <Route path={immunisationsRoute} element={<ProgramListView />} />
      <Route path={immunisationRoute} element={<ProgramView />} />
      <Route
        path={immunisationDetailRoute}
        element={<ImmunisationDetailView />}
      />
    </Routes>
  );
};

export default ImmunisationService;
