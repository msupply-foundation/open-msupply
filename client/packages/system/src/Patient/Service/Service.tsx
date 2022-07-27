import React, { FC } from 'react';
import { Routes, Route, RouteBuilder } from '@openmsupply-client/common';
import { PatientListView } from '../ListView';
import { PatientDetailView } from '../DetailView';
import { ProgramListView } from '../../ProgramEnrollment';

const singlePatientRoute = RouteBuilder.create(':patientId').build();
const patientProgramEnrolmentRoute = RouteBuilder.create(':patientId')
  .addPart('programs')
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
    </Routes>
  );
};

export default Service;
