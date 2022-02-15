import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { MasterListListView } from '../ListView';

export const MasterListService: FC = () => {
  const masterListRoute = RouteBuilder.create(AppRoute.MasterLists).build();

  return (
    <Routes>
      <Route path={masterListRoute} element={<MasterListListView />} />
    </Routes>
  );
};

export default MasterListService;
