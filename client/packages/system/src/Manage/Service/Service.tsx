import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { IndicatorsDemographics } from '../IndicatorsDemographics/DetailView/IndicatorsDemographics';
import { EditGlobalPreferencesPage } from '../Preferences/EditPage';
import { CampaignsList } from '../Campaigns';
import { ReportsList } from '../Reports';
import { SitesList } from '../Sites';
import { PropertiesListView, PropertiesDetailView } from '../Properties';

export const ManageService: FC = () => {
  const indicatorsDemographicsRoute = RouteBuilder.create(
    AppRoute.IndicatorsDemographics
  ).build();

  const preferencesRoute = RouteBuilder.create(AppRoute.GlobalPreferences)
    .addPart(':key?')
    .build();

  const campaignsRoute = RouteBuilder.create(AppRoute.Campaigns).build();
  const reportsRoute = RouteBuilder.create(AppRoute.Reports).build();
  const sitesRoute = RouteBuilder.create(AppRoute.Sites).build();
  const propertiesRoute = RouteBuilder.create(AppRoute.Properties).build();
  const propertyDetailRoute = RouteBuilder.create(AppRoute.Properties)
    .addPart(':id')
    .build();

  return (
    <Routes>
      <Route
        path={indicatorsDemographicsRoute}
        element={<IndicatorsDemographics />}
      />
      <Route path={preferencesRoute} element={<EditGlobalPreferencesPage />} />
      <Route path={campaignsRoute} element={<CampaignsList />} />
      <Route path={reportsRoute} element={<ReportsList />} />
      <Route path={sitesRoute} element={<SitesList />} />
      <Route path={propertyDetailRoute} element={<PropertiesDetailView />} />
      <Route path={propertiesRoute} element={<PropertiesListView />} />
    </Routes>
  );
};

export default ManageService;
