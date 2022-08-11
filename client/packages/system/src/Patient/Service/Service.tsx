import React, { FC } from 'react';
import { Routes, Route, RouteBuilder } from '@openmsupply-client/common';
import { PatientListView } from '../ListView';
import { PatientDetailView } from '../DetailView';
import { AppRoute } from 'packages/config/src';

const patientListRoute = RouteBuilder.create(AppRoute.Patients).build();

const singlePatientRoute = RouteBuilder.create(AppRoute.Patients)
  .addPart(':patientId')
  .build();

export const Service: FC = () => {
  return (
    <Routes>
      <Route path={patientListRoute} element={<PatientListView />} />
      <Route path={singlePatientRoute} element={<PatientDetailView />} />
    </Routes>
  );
};

export default Service;
