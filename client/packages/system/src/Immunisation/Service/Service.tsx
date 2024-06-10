import React, { FC } from 'react';
import {
  RouteBuilder,
  Routes,
  Route,
  NothingHere,
} from '@openmsupply-client/common';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { ImmunisationProgramListView } from '../ListView';
import { ImmunisationProgramView } from '../ImmunisationProgramView';

export const ImmunisationProgramService: FC = () => {
  const immunisationProgramsRoute = RouteBuilder.create(
    AppRoute.ImmunisationPrograms
  ).build();
  const immunisationProgramRoute = RouteBuilder.create(
    AppRoute.ImmunisationPrograms
  )
    .addPart(':id')
    .build();

  if (!Environment.FEATURE_GAPS) {
    return <NothingHere />;
  }
  return (
    <Routes>
      <Route
        path={immunisationProgramsRoute}
        element={<ImmunisationProgramListView />}
      />
      <Route
        path={immunisationProgramRoute}
        element={<ImmunisationProgramView />}
      />
    </Routes>
  );
};

export default ImmunisationProgramService;
