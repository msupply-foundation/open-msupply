import React, { FC } from 'react';
import { Routes, Route, useLocation, matchPath, usePluginProvider } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ListView } from './ListView';
import { DetailView } from './DetailView';

const ReportsService: FC = () => {
  const location = useLocation();
  const { plugins } = usePluginProvider();
  const pluginReportPage = plugins.reports?.page?.find(({ path }) => {
    const fullPath = `/${path}`;
    return (
      !!matchPath({ path: fullPath, end: true }, location.pathname.replace(`/${AppRoute.Reports}`, '')) ||
      !!matchPath({ path: `${fullPath}/*` }, location.pathname.replace(`/${AppRoute.Reports}`, ''))
    );
  });

  if (pluginReportPage) {
    const Component = pluginReportPage.Component;
    return <Component />;
  }

  return (
    <Routes>
      <Route path="/:id" element={<DetailView />} />
      <Route path="/" element={<ListView />} />
    </Routes>
  );
};

export default ReportsService;
