import React, { FC } from 'react';
import { DetailTabs, Typography } from '@common/components';
import { TemperatureLogList } from './TemperatureLog';
import { useTranslation } from '@common/intl';
import {
  Box,
  TemperatureBreachSortFieldInput,
  TemperatureLogSortFieldInput,
} from '@openmsupply-client/common';
import { TemperatureBreachList } from './TemperatureBreach';

export const ListView: FC = () => {
  const t = useTranslation('coldchain');

  const tabs = [
    {
      Component: (
        <Box padding={4}>
          <Typography variant="h5">{t('message.coming-soon')}</Typography>
        </Box>
      ),
      value: t('label.chart'),
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

  return <DetailTabs tabs={tabs} />;
};
