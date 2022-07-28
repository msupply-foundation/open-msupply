import React, { FC } from 'react';
import { Routes, Route, RouteBuilder } from '@openmsupply-client/common';
import { PatientListView } from '../ListView';
import { PatientDetailView } from '../DetailView';
import { ProgramListView } from '../../ProgramEnrolment';
import { ProgramDetailView } from '../../ProgramEnrolment/DetailView';
import { AppRoute } from 'packages/config/src';

const singlePatientRoute = RouteBuilder.create(':patientId').build();
const patientProgramEnrolmentRoute = RouteBuilder.create(':patientId')
  .addPart(AppRoute.Programs)
  .build();
const singleProgramEnrolmentRoute = RouteBuilder.create(':patientId')
  .addPart(AppRoute.Programs)
  .addPart(':programType')
  .build();

export const Service: FC = () => {
  return (
    <Routes>
      <Route path={''} element={<PatientListView />} />
      <Route path={singlePatientRoute} element={<PatientDetailView />} />
      <Route
        path={patientProgramEnrolmentRoute}
        element={<ProgramListView />}
      />
      <Route
        path={singleProgramEnrolmentRoute}
        element={<ProgramDetailView />}
      />
    </Routes>
  );
};

export default Service;
