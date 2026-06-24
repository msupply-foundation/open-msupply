import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { IndicatorsDemographics } from '../IndicatorsDemographics/DetailView/IndicatorsDemographics';
import { EditGlobalPreferencesPage } from '../Preferences/EditPage';
import { CampaignsList } from '../Campaigns';
import { ReportsList } from '../Reports';
<<<<<<< HEAD
import { SyncMessageListView } from '../../SyncMessages';
import { PluginsList } from '../Plugins';
=======
import { SitesList } from '../Sites';
>>>>>>> origin/v3.0.0-RC

export const ManageService: FC = () => {
  const indicatorsDemographicsRoute = RouteBuilder.create(
    AppRoute.IndicatorsDemographics
  ).build();

  const preferencesRoute = RouteBuilder.create(AppRoute.GlobalPreferences)
    .addPart(':key?')
    .build();

  const campaignsRoute = RouteBuilder.create(AppRoute.Campaigns).build();
  const reportsRoute = RouteBuilder.create(AppRoute.Reports).build();
<<<<<<< HEAD
  const syncMessageRoute = RouteBuilder.create(AppRoute.SyncMessage).build();
  const pluginsRoute = RouteBuilder.create(AppRoute.Plugins).build();
=======
  const sitesRoute = RouteBuilder.create(AppRoute.Sites).build();
>>>>>>> origin/v3.0.0-RC

  return (
    <Routes>
      <Route
        path={indicatorsDemographicsRoute}
        element={<IndicatorsDemographics />}
      />
      <Route path={preferencesRoute} element={<EditGlobalPreferencesPage />} />
      <Route path={campaignsRoute} element={<CampaignsList />} />
      <Route path={reportsRoute} element={<ReportsList />} />
<<<<<<< HEAD
      <Route path={syncMessageRoute} element={<SyncMessageListView />} />
      <Route path={pluginsRoute} element={<PluginsList />} />
=======
      <Route path={sitesRoute} element={<SitesList />} />
>>>>>>> origin/v3.0.0-RC
    </Routes>
  );
};

export default ManageService;
