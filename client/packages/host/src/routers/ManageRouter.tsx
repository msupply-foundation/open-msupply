import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const NameService = React.lazy(
  () => import('@openmsupply-client/system/src/Name/Service')
);

const fullFacilitiesPath = RouteBuilder.create(AppRoute.Manage)
  .addPart(AppRoute.Facilities)
  .addWildCard()
  .build();

export const ManageRouter: FC = () => {
  const gotoCustomers = useMatch(fullFacilitiesPath);

  if (gotoCustomers) {
    return <NameService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
