import React from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { AssetListView } from '../ListView';
// import { AssetDetailView } from '../DetailView';

const Service = () => {
  const assetsRoute = RouteBuilder.create(AppRoute.Assets).build();

  // const assetRoute = RouteBuilder.create(AppRoute.Assets)
  //   .addPart(':id')
  //   .build();

  return (
    <Routes>
      <Route path={assetsRoute} element={<AssetListView />} />
      {/* <Route path={assetRoute} element={<AssetDetailView />} /> */}
    </Routes>
  );
};

export default Service;
