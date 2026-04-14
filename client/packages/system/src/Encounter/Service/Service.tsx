import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { EncounterListView } from '../ListView';
import { DetailView } from '../DetailView';

export const Service: FC = () => {
  const encountersRoute = RouteBuilder.create(AppRoute.Encounter).build();
  const encounterRoute = RouteBuilder.create(AppRoute.Encounter)
    .addPart(':id')
    .build();

  return (
    <Routes>
      <Route path={encountersRoute} element={<EncounterListView />} />
      <Route path={encounterRoute} element={<DetailView />} />
    </Routes>
  );
};

export default Service;
