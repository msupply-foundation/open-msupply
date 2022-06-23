import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const PatientService = React.lazy(
  () => import('@openmsupply-client/system/src/Patient/Service')
);

const fullPatientsPath = RouteBuilder.create(AppRoute.Patients)
  .addWildCard()
  .build();

console.log('fullPatientsPath', fullPatientsPath);

export const PatientRouter: FC = () => {
  const gotoPatients = useMatch(fullPatientsPath);

  if (gotoPatients) {
    return <PatientService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
