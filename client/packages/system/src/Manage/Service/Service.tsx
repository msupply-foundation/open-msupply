import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { IndicatorsDemographics } from '../IndicatorsDemographics/DetailView/IndicatorsDemographics';
import { EditGlobalPreferencesPage } from '../Preferences/EditPage';
import { CampaignsList } from '../Campaigns';
import { CustomFieldsList } from '../CustomFields';
import { ReportsList } from '../Reports';
import { SyncMessageListView } from '../../SyncMessages';
import { PluginsList } from '../Plugins';
import { HelpDocumentsList } from '../HelpDocuments';
import { SitesList } from '../Sites';

export const ManageService: FC = () => {
  const indicatorsDemographicsRoute = RouteBuilder.create(
    AppRoute.IndicatorsDemographics
  ).build();

  const preferencesRoute = RouteBuilder.create(AppRoute.GlobalPreferences)
    .addPart(':key?')
    .build();

  const campaignsRoute = RouteBuilder.create(AppRoute.Campaigns).build();
  const customFieldsRoute = RouteBuilder.create(AppRoute.CustomFields).build();
  const reportsRoute = RouteBuilder.create(AppRoute.Reports).build();
  const syncMessageRoute = RouteBuilder.create(AppRoute.SyncMessage).build();
  const pluginsRoute = RouteBuilder.create(AppRoute.Plugins).build();
  const helpDocumentsRoute = RouteBuilder.create(AppRoute.HelpDocuments).build();
  const sitesRoute = RouteBuilder.create(AppRoute.Sites).build();

  return (
    <Routes>
      <Route
        path={indicatorsDemographicsRoute}
        element={<IndicatorsDemographics />}
      />
      <Route path={preferencesRoute} element={<EditGlobalPreferencesPage />} />
      <Route path={campaignsRoute} element={<CampaignsList />} />
      <Route path={customFieldsRoute} element={<CustomFieldsList />} />
      <Route path={reportsRoute} element={<ReportsList />} />
      <Route path={syncMessageRoute} element={<SyncMessageListView />} />
      <Route path={pluginsRoute} element={<PluginsList />} />
      <Route path={helpDocumentsRoute} element={<HelpDocumentsList />} />
      <Route path={sitesRoute} element={<SitesList />} />
    </Routes>
  );
};

export default ManageService;
