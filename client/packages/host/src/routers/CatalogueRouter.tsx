import React, { FC } from 'react';
import { Navigate, useMatch } from 'react-router-dom';
import { RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const ItemService = React.lazy(
  () => import('@openmsupply-client/system/src/Item/Service/Service')
);

const fullItemPath = RouteBuilder.create(AppRoute.Catalogue)
  .addPart(AppRoute.Items)
  .addWildCard()
  .build();

export const CatalogueRouter: FC = () => {
  if (useMatch(fullItemPath)) {
    return <ItemService />;
  } else {
    const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
    return <Navigate to={notFoundRoute} />;
  }
};
