import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const NameService = React.lazy(
  () => import('@openmsupply-client/system/src/Name/Service')
);

const ManageService = React.lazy(
  () => import('@openmsupply-client/system/src/Manage/Service')
);

const EquipmentService = React.lazy(
  () => import('@openmsupply-client/coldchain/src/ColdchainService')
);

const PropertyService = React.lazy(
  () => import('@openmsupply-client/system/src/Property/Service')
);

const fullFacilitiesPath = RouteBuilder.create(AppRoute.Manage)
  .addPart(AppRoute.Stores)
  .addWildCard()
  .build();

const fullEquipmentPath = RouteBuilder.create(AppRoute.Manage)
  .addPart(AppRoute.Equipment)
  .addWildCard()
  .build();

const fullPropertiesPath = RouteBuilder.create(AppRoute.Manage)
  .addPart(AppRoute.Properties)
  .addWildCard()
  .build();

const fullManagePath = RouteBuilder.create(AppRoute.Manage)
  .addWildCard()
  .build();

export const ManageRouter: FC = () => {
  const gotoFacilities = useMatch(fullFacilitiesPath);
  const gotoEquipment = useMatch(fullEquipmentPath);
  const gotoProperties = useMatch(fullPropertiesPath);
  const goToManage = useMatch(fullManagePath);

  if (gotoFacilities) {
    return <NameService />;
  }

  if (gotoEquipment) {
    return <EquipmentService />;
  }

  if (gotoProperties) {
    return <PropertyService />;
  }

  // Put this last to catch all other routes
  if (goToManage) {
    return <ManageService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
