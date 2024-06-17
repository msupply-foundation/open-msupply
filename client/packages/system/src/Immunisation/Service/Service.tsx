import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ImmunisationProgramListView } from '../ListView';
import { ImmunisationProgramDetailView } from '../ImmunisationProgramDetailView';
import { VaccineCourseView } from '../VaccineCourseView';

export const ImmunisationProgramService: FC = () => {
  const immunisationProgramsRoute = RouteBuilder.create(
    AppRoute.ImmunisationPrograms
  ).build();
  const immunisationProgramRoute = RouteBuilder.create(
    AppRoute.ImmunisationPrograms
  )
    .addPart(':id')
    .build();
  const immunisationDetailRoute = RouteBuilder.create(
    AppRoute.ImmunisationPrograms
  )
    .addPart(':id')
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
      <Route path={immunisationDetailRoute} element={<VaccineCourseView />} />
    </Routes>
  );
};

export default ImmunisationProgramService;
