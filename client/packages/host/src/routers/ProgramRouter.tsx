import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const ProgramService = React.lazy(
  () => import('@openmsupply-client/programs/src/Service/Service')
);

const programsFullPath = RouteBuilder.create(AppRoute.Programs)
  .addWildCard()
  .build();

export const ProgramsRouter: FC = () => {
  const gotoImmunisations = useMatch(programsFullPath);

  if (gotoImmunisations) {
    return <ProgramService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
