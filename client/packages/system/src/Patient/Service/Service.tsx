import React, { FC } from 'react';
import { Routes, Route, RouteBuilder } from '@openmsupply-client/common';
import { PatientListView } from '../ListView';
import { PatientDetailView } from '../DetailView';
import { ProgramListView } from '../../ProgramEnrollment';
import { ProgramDetailView } from '../../ProgramEnrollment/DetailView';

const singlePatientRoute = RouteBuilder.create(':patientId').build();
const patientProgramEnrolmentRoute = RouteBuilder.create(':patientId')
  .addPart('programs')
  .build();
const singleProgramEnrolmentRoute = RouteBuilder.create(':patientId')
  .addPart('programs')
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
