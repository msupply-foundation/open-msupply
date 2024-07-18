import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ImmunisationProgramListView } from '../ImmunisationProgramListView';
import { ImmunisationProgramDetailView } from '../ImmunisationProgramDetailView';
import { RnRFormListView } from '../RnRForms';

export const ProgramService: FC = () => {
  const immunisationProgramsRoute = RouteBuilder.create(
    AppRoute.ImmunisationPrograms
  ).build();
  const immunisationProgramRoute = RouteBuilder.create(
    AppRoute.ImmunisationPrograms
  )
    .addPart(':id')
    .build();

  const rnrFormsRoute = RouteBuilder.create(
    AppRoute.RnRForms
  ).build();

  return (
    <Routes>
      <Route
        path={immunisationProgramsRoute}
        element={<ImmunisationProgramListView />}
      />
      <Route
        path={immunisationProgramRoute}
        element={<ImmunisationProgramDetailView />}
      />
      <Route
        path={rnrFormsRoute}
        element={<RnRFormListView />}
      />
    </Routes>
  );
};

export default ProgramService;
