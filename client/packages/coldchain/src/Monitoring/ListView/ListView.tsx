import React, { FC } from 'react';
import { DetailTabs } from '@common/components';
import { TemperatureLogList } from './TemperatureLog';
import { useTranslation } from '@common/intl';
import {
  TemperatureBreachSortFieldInput,
  TemperatureLogSortFieldInput,
} from '@openmsupply-client/common';
import { TemperatureBreachList } from './TemperatureBreach';
import { AppBarButtons } from './AppBarButtons';
import { TemperatureChart } from '../../common/Monitoring/TemperatureChart/';

export const ListView: FC = () => {
  const t = useTranslation();

  const tabs = [
    {
      Component: <TemperatureChart />,
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
