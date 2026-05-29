import React, { lazy, Suspense } from 'react';
import { Card } from '@common/components';

const TemperatureChart = lazy(() =>
  import('../../common/Monitoring').then(m => ({ default: m.TemperatureChart }))
);

export const MobileTemperatureChart = () => {
  return (
    <Card
      sx={{
        m: 1,
        width: '100%',
        border: '1px solid',
        borderColor: '#eee',
        borderRadius: 4,
      }}
    >
      <Suspense fallback={null}>
        <TemperatureChart />
      </Suspense>
    </Card>
  );
};
