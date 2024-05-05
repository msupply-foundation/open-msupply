import React, { FC } from 'react';
import { DetailTabs } from '@common/components';
import { TemperatureLogList } from './TemperatureLog';
import { useTranslation } from '@common/intl';
import {
  TemperatureBreachSortFieldInput,
  TemperatureLogSortFieldInput,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { TemperatureBreachList } from './TemperatureBreach';
import { TemperatureChart } from './TemperatureChart';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import { temperatureLogFilterAndSort } from './TemperatureLog/TemperatureLogList';

export const ListView: FC = () => {
  const t = useTranslation('coldchain');

  const {
    // updateSortQuery,
    // updatePaginationQuery,
    filter,
    // queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams(temperatureLogFilterAndSort);

  const tabs = [
    {
      Component: <TemperatureChart filter={filter} />,
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
      <Toolbar filter={filter}></Toolbar>
      <DetailTabs tabs={tabs} overwriteQuery={false} />
    </>
  );
};
