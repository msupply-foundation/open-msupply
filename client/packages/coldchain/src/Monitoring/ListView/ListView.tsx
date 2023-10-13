import React, { FC } from 'react';
import { DetailTabs } from '@common/components';
import { TemperatureLogList } from './TemperatureLogs';
import { useTranslation } from '@common/intl';

export const ListView: FC = () => {
  const t = useTranslation('coldchain');

  const tabs = [
    {
      Component: <div />,
      value: t('label.chart'),
    },
    {
      Component: <div />,
      value: t('label.breaches'),
    },
    {
      Component: <TemperatureLogList />,
      value: t('label.log'),
    },
  ];

  return <DetailTabs tabs={tabs} />;
};
