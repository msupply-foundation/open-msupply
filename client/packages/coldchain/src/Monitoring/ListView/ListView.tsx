import React, { FC, lazy, Suspense } from 'react';
import { DetailTabs } from '@common/components';
import { TemperatureLogList } from './TemperatureLog';
import { useTranslation } from '@common/intl';
import {
  TemperatureBreachSortFieldInput,
  TemperatureLogSortFieldInput,
} from '@openmsupply-client/common';
import { TemperatureBreachList } from './TemperatureBreach';
import { AppBarButtons } from './AppBarButtons';
// Lazy-loaded: pulls in `recharts` only when the chart tab renders.
const TemperatureChart = lazy(() =>
  import('../../common/Monitoring/TemperatureChart/').then(m => ({
    default: m.TemperatureChart,
  }))
);

export const ListView: FC = () => {
  const t = useTranslation();

  const tabs = [
    {
      Component: (
        <Suspense fallback={null}>
          <TemperatureChart />
        </Suspense>
      ),
      value: t('label.chart'),
      sort: {
        key: TemperatureLogSortFieldInput.Datetime,
        dir: 'desc' as 'desc' | 'asc',
      },
    },
    {
      Component: <TemperatureBreachList />,
      value: t('label.breaches'),
      sort: {
        key: TemperatureBreachSortFieldInput.StartDatetime,
        dir: 'desc' as 'desc' | 'asc',
      },
    },
    {
      Component: <TemperatureLogList />,
      value: t('label.log'),
      sort: {
        key: TemperatureLogSortFieldInput.Datetime,
        dir: 'desc' as 'desc' | 'asc',
      },
    },
  ];

  return (
    <>
      <AppBarButtons />
      <DetailTabs tabs={tabs} overwriteQuery={false} restoreTabQuery={false} />
    </>
  );
};
