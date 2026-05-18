import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { IndicatorsDemographics } from '../IndicatorsDemographics/DetailView/IndicatorsDemographics';
import { EditGlobalPreferencesPage } from '../Preferences/EditPage';
import { CampaignsList } from '../Campaigns';
import { ReportsList } from '../Reports';
import { SyncMessageListView } from '../../SyncMessages';

export const ManageService: FC = () => {
  const indicatorsDemographicsRoute = RouteBuilder.create(
    AppRoute.IndicatorsDemographics
  ).build();

  const preferencesRoute = RouteBuilder.create(AppRoute.GlobalPreferences)
    .addPart(':key?')
    .build();

  const campaignsRoute = RouteBuilder.create(AppRoute.Campaigns).build();
  const reportsRoute = RouteBuilder.create(AppRoute.Reports).build();
  const syncMessageRoute = RouteBuilder.create(AppRoute.SyncMessage).build();

  return (
    <Routes>
      <Route
        path={indicatorsDemographicsRoute}
        element={<IndicatorsDemographics />}
      />
      <Route path={preferencesRoute} element={<EditGlobalPreferencesPage />} />
      <Route path={campaignsRoute} element={<CampaignsList />} />
      <Route path={reportsRoute} element={<ReportsList />} />
      <Route path={syncMessageRoute} element={<SyncMessageListView />} />
    </Routes>
  );
};

export default ManageService;
