import React, { FC } from 'react';
import { Routes, Route, RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { PatientListView } from '../ListView';

const singlePatientRoute = RouteBuilder.create(AppRoute.Patients)
  .addPart(':patientId')
  .addPart(':docType')
  .build();

console.log('singlePatientRoute', singlePatientRoute);

export const Service: FC = () => {
  return (
    <Routes>
      <Route path={''} element={<PatientListView />} />
      <Route path={singlePatientRoute} element={<p>HERE</p>} />
    </Routes>
  );
};

export default Service;
