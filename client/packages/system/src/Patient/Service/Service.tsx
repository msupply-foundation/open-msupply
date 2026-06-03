import React, { FC, Suspense } from 'react';
import { Routes, Route, RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

// Lazy: PatientView and VaccinationCard pull in JsonForms / programs /
// encounter forms (~480KB). Keep that off the /dispensary/patients list.
const PatientListView = React.lazy(() =>
  import('../ListView').then(m => ({ default: m.PatientListView }))
);
const PatientView = React.lazy(() =>
  import('../PatientView').then(m => ({ default: m.PatientView }))
);
const VaccinationCardDetailView = React.lazy(() =>
  import('../VaccinationCard/DetailView').then(m => ({
    default: m.VaccinationCardDetailView,
  }))
);

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
    <Suspense fallback={null}>
      <Routes>
        <Route path={patientListRoute} element={<PatientListView />} />
        <Route
          path={vaccinationCardRoute}
          element={<VaccinationCardDetailView />}
        />
        <Route path={singlePatientRoute} element={<PatientView />} />
      </Routes>
    </Suspense>
  );
};

export default Service;
