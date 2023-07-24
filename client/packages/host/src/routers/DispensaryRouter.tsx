import React, { FC } from 'react';
import {
  RouteBuilder,
  Navigate,
  useMatch,
  ReportContext,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const PatientService = React.lazy(
  () => import('@openmsupply-client/system/src/Patient/Service')
);

const EncounterService = React.lazy(
  () => import('@openmsupply-client/system/src/Encounter/Service')
);

const ReportService = React.lazy(
  () => import('@openmsupply-client/system/src/Report/Service')
);

const fullPatientsPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart(AppRoute.Patients)
  .addWildCard()
  .build();

const fullEncountersPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart(AppRoute.Encounter)
  .addWildCard()
  .build();

const fullReportsPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart(AppRoute.Reports)
  .build();

export const DispensaryRouter: FC = () => {
  const gotoPatients = useMatch(fullPatientsPath);
  const gotoEncounters = useMatch(fullEncountersPath);
  const gotoReports = useMatch(fullReportsPath);

  if (gotoPatients) {
    return <PatientService />;
  }

  if (gotoEncounters) {
    return <EncounterService />;
  }

  if (gotoReports) {
    return <ReportService context={ReportContext.Dispensary} />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
