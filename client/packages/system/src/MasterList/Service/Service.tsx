import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { MasterListListView } from '../ListView';
import { MasterListDetailView } from '../DetailView';

export const MasterListService: FC = () => {
  const masterListsRoute = RouteBuilder.create(AppRoute.MasterLists).build();
  const masterListRoute = RouteBuilder.create(AppRoute.MasterLists)
    .addPart(':id')
    .build();

  return (
    <Routes>
      <Route path={masterListsRoute} element={<MasterListListView />} />
      <Route path={masterListRoute} element={<MasterListDetailView />} />
    </Routes>
  );
};

export default MasterListService;
