import React, { FC } from 'react';
import { Routes, Route, RouteBuilder } from '@openmsupply-client/common';
import { PatientListView } from '../ListView';
import { PatientDetailView } from '../DetailView';

const singlePatientRoute = RouteBuilder.create(':patientId')
  .addPart(':docType')
  .build();

export const Service: FC = () => {
  return (
    <Routes>
      <Route path={''} element={<PatientListView />} />
      <Route path={singlePatientRoute} element={<PatientDetailView />} />
    </Routes>
  );
};

export default Service;
