import React from 'react';
import {
  AppNavLink,
  RouteBuilder,
  Plugins,
  StoreModeNodeType,
} from '@openmsupply-client/common';
import { InvoiceIcon } from '@common/icons';
import { AppRoute } from '@openmsupply-client/config';
import {
  DailyTallyListView,
  DailyTallyReportView,
  DailyTallyView,
} from '@openmsupply-client/invoices';
import { ReportWidget } from '@openmsupply-client/reports/src/components';

const dailyTallyRoute = RouteBuilder.create(AppRoute.Dispensary)
  .addPart('daily-tally')
  .build();

const DailyTallyNavLink = ({ store }: { store?: { storeMode?: StoreModeNodeType } }) => (
  <AppNavLink
    visible={store?.storeMode === StoreModeNodeType.Dispensary}
    to={dailyTallyRoute}
    text={'Daily Tally'}
  />
);

const DailyTallyReportWidget = () => (
  <ReportWidget
    title={'Daily Tally'}
    Icon={InvoiceIcon}
    reports={[
      {
        id: 'daily-tally',
        code: 'daily_tally_coverage',
        name: 'Daily Tally Coverage Report',
        argumentSchema: null,
      } as never,
    ]}
    onReportClick={() => {
      window.location.assign(RouteBuilder.create(AppRoute.Reports).addPart('daily-tally').build());
    }}
    hasReports={true}
  />
);

const plugins: Plugins = {
  dispensary: {
    navLink: [DailyTallyNavLink],
    page: [
      {
        path: 'daily-tally/new',
        Component: DailyTallyView,
      },
      {
        path: 'daily-tally',
        Component: DailyTallyListView,
      },
    ],
  },
  reports: {
    widget: [DailyTallyReportWidget],
    page: [
      {
        path: 'daily-tally',
        Component: DailyTallyReportView,
      },
    ],
  },
};

export default plugins;