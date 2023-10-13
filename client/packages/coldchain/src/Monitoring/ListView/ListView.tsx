import React, { FC } from 'react';
import { DetailTabs } from '@common/components';
import { TemperatureLogList } from './TemperatureLogs';

export const ListView: FC = () => {
  const tabs = [
    {
      Component: <div />,
      value: 'Charts',
    },
    {
      Component: <div />,
      value: 'Breaches',
    },
    {
      Component: <TemperatureLogList />,
      value: 'Logs',
    },
  ];

  return <DetailTabs tabs={tabs} />;
};
