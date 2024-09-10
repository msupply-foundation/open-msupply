import React, { FC } from 'react';
import { Routes, Route, RouteBuilder } from '@openmsupply-client/common';
import { PatientListView } from '../ListView';
import { PatientView } from '../PatientView';
import { AppRoute } from '@openmsupply-client/config';
import { VaccinationCardDetailView } from '../VaccinationCards/DetailView';

const patientListRoute = RouteBuilder.create(AppRoute.Patients).build();

const vaccinationCardRoute = RouteBuilder.create(AppRoute.Patients)
  .addPart(':patientId')
  .addPart(AppRoute.VaccineCard)
  .addPart(':programEnrolmentId')
  .build();

const singlePatientRoute = RouteBuilder.create(AppRoute.Patients)
  .addPart(':patientId')
  .build();

export const Service: FC = () => {
  return (
    <Routes>
      <Route path={patientListRoute} element={<PatientListView />} />
      <Route
        path={vaccinationCardRoute}
        element={<VaccinationCardDetailView />}
      />
      <Route path={singlePatientRoute} element={<PatientView />} />
    </Routes>
  );
};

export default Service;
