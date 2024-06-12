import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const NameService = React.lazy(
  () => import('@openmsupply-client/system/src/Name/Service')
);

const IndicatorsDemographicsService = React.lazy(
  () =>
    import(
      '@openmsupply-client/system/src/IndicatorsDemographics/Service/Service'
    )
);

const fullFacilitiesPath = RouteBuilder.create(AppRoute.Manage)
  .addPart(AppRoute.Facilities)
  .addWildCard()
  .build();

const fullIndicatorsDemographicsPath = RouteBuilder.create(AppRoute.Manage)
  .addPart(AppRoute.IndicatorsDemographics)
  .addWildCard()
  .build();

export const ManageRouter: FC = () => {
  const gotoFacilities = useMatch(fullFacilitiesPath);
  const gotoIndicatorsDemographics = useMatch(fullIndicatorsDemographicsPath);

  if (gotoFacilities) {
    return <NameService />;
  }

  if (gotoIndicatorsDemographics) {
    return <IndicatorsDemographicsService />;
  }
  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
