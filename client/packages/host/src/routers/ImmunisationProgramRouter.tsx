import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const ImmunisationProgramService = React.lazy(
  () => import('@openmsupply-client/system/src/Immunisation/Service/Service')
);

const immunisationFullPath = RouteBuilder.create(AppRoute.Programs)
  .addPart(AppRoute.ImmunisationPrograms)
  .addWildCard()
  .build();

export const ProgramsRouter: FC = () => {
  const gotoImmunisations = useMatch(immunisationFullPath);

  if (gotoImmunisations) {
    return <ImmunisationProgramService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
