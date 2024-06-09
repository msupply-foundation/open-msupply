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

export const ImmunisationService: FC = () => {
  const immunisationsRoute = RouteBuilder.create(
    AppRoute.Immunisations
  ).build();
  const immunisationRoute = RouteBuilder.create(AppRoute.Immunisations)
    .addPart(':id')
    .build();

  if (!Environment.FEATURE_GAPS) {
    return <NothingHere />;
  }
  return (
    <Routes>
      <Route path={immunisationsRoute} element={<ProgramListView />} />
      <Route path={immunisationRoute} element={<ProgramView />} />
    </Routes>
  );
};

export default ImmunisationService;
