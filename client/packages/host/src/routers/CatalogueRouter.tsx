import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const AssetService = React.lazy(
  () => import('@openmsupply-client/system/src/Asset/Service/Service')
);

const ItemService = React.lazy(
  () => import('@openmsupply-client/system/src/Item/Service/Service')
);

const MasterListService = React.lazy(
  () => import('@openmsupply-client/system/src/MasterList/Service/Service')
);

const fullAssetPath = RouteBuilder.create(AppRoute.Catalogue)
  .addPart(AppRoute.Assets)
  .addWildCard()
  .build();

const fullItemPath = RouteBuilder.create(AppRoute.Catalogue)
  .addPart(AppRoute.Items)
  .addWildCard()
  .build();

const fullMasterListPath = RouteBuilder.create(AppRoute.Catalogue)
  .addPart(AppRoute.MasterLists)
  .addWildCard()
  .build();

export const CatalogueRouter: FC = () => {
  const gotoAssets = useMatch(fullAssetPath);
  const gotoItems = useMatch(fullItemPath);
  const gotoMasterLists = useMatch(fullMasterListPath);

  if (gotoAssets) {
    return <AssetService />;
  }
  if (gotoItems) {
    return <ItemService />;
  }

  if (gotoMasterLists) {
    return <MasterListService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
