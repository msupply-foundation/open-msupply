import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ImmunisationProgramListView } from '../ImmunisationProgramListView';
import { ImmunisationProgramDetailView } from '../ImmunisationProgramDetailView';
import { RnRFormDetailView, RnRFormListView } from '../RnRForms';

export const ProgramService: FC = () => {
  const immunisationProgramsRoute = RouteBuilder.create(
    AppRoute.ImmunisationPrograms
  ).build();

  const immunisationProgramRoute = RouteBuilder.create(
    AppRoute.ImmunisationPrograms
  )
    .addPart(':id')
    .build();

  const rnrFormsRoute = RouteBuilder.create(AppRoute.RnRForms).build();

  const rnrFormRoute = RouteBuilder.create(AppRoute.RnRForms)
    .addPart(':id')
    .build();

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
      <Route path={rnrFormsRoute} element={<RnRFormListView />} />
      <Route path={rnrFormRoute} element={<RnRFormDetailView />} />
    </Routes>
  );
};

export default ProgramService;
