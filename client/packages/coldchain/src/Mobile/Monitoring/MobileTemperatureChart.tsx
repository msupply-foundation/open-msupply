import React from 'react';
import { TemperatureChart } from '../../common/Monitoring';
import { Card } from '@common/components';

export const MobileTemperatureChart = () => {
  return (
    <Card
      sx={{
        width: '100%',
        border: '1px solid',
        borderColor: '#eee',
        borderRadius: 4,
        my: 2,
        mx: 2,
      }}
    >
      <TemperatureChart />
    </Card>
  );
};
