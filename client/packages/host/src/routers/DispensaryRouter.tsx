import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const PatientService = React.lazy(
  () => import('@openmsupply-client/system/src/Patient/Service')
);

const EncounterService = React.lazy(
  () => import('@openmsupply-client/system/src/Encounter/Service')
);

const fullPatientsPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart(AppRoute.Patients)
  .addWildCard()
  .build();

const fullEncountersPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart(AppRoute.Encounter)
  .addWildCard()
  .build();

export const DispensaryRouter: FC = () => {
  const gotoPatients = useMatch(fullPatientsPath);
  const gotoEncounters = useMatch(fullEncountersPath);

  if (gotoPatients) {
    return <PatientService />;
  }

  if (gotoEncounters) {
    return <EncounterService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
