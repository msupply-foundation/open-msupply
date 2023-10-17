import React, { FC } from 'react';
import { DetailTabs, Typography } from '@common/components';
import { TemperatureLogList } from './TemperatureLogs';
import { useTranslation } from '@common/intl';
import { Box } from '@openmsupply-client/common';

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
      Component: (
        <Box padding={4}>
          <Typography variant="h5">{t('message.coming-soon')}</Typography>
        </Box>
      ),
      value: t('label.breaches'),
    },
    {
      Component: <TemperatureLogList />,
      value: t('label.log'),
    },
  ];

  return <DetailTabs tabs={tabs} />;
};
