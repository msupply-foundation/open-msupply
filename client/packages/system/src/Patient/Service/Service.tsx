import React, { FC } from 'react';
import { Routes, Route, RouteBuilder } from '@openmsupply-client/common';
import { PatientListView } from '../ListView';
import { PatientView } from '../PatientView';
import { AppRoute } from '@openmsupply-client/config';

const patientListRoute = RouteBuilder.create(AppRoute.Patients).build();

const singlePatientRoute = RouteBuilder.create(AppRoute.Patients)
  .addPart(':patientId')
  .build();

export const Service: FC = () => {
  return (
    <Routes>
      <Route path={patientListRoute} element={<PatientListView />} />
      <Route path={singlePatientRoute} element={<PatientView />} />
    </Routes>
  );
};

export default Service;
