import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const ImmunisationService = React.lazy(
  () => import('@openmsupply-client/system/src/Immunisation/Service/Service')
);

const immunisationFullPath = RouteBuilder.create(AppRoute.Programs)
  .addPart(AppRoute.Immunisations)
  .addWildCard()
  .build();

export const ProgramsRouter: FC = () => {
  const gotoImmunisations = useMatch(immunisationFullPath);

  if (gotoImmunisations) {
    return <ImmunisationService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
