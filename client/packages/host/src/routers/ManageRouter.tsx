import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const NameService = React.lazy(
  () => import('@openmsupply-client/system/src/Name/Service')
);

const ManageService = React.lazy(
  () => import('@openmsupply-client/system/src/Manage/Service')
);

const fullFacilitiesPath = RouteBuilder.create(AppRoute.Manage)
  .addPart(AppRoute.Facilities)
  .addWildCard()
  .build();

const fullManagePath = RouteBuilder.create(AppRoute.Manage)
  .addWildCard()
  .build();

export const ManageRouter: FC = () => {
  const gotoFacilities = useMatch(fullFacilitiesPath);
  const goToManage = useMatch(fullManagePath);

  if (gotoFacilities) {
    return <NameService />;
  }

  if (goToManage) {
    return <ManageService />;
  }
  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
