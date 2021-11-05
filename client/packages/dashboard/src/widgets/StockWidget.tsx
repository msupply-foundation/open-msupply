import React from 'react';
import { Grid } from '@openmsupply-client/common';
import Widget from './Widget';
import { StatsPanel } from '../StatsPanel';

export const StockWidget: React.FC = () => (
  <Widget titleKey="app.stock">
    {' '}
    <Grid container justifyContent="flex-start" flex={1}>
      <Grid item>
        <StatsPanel
          titleKey="heading.expiring-stock"
          stats={[
            { labelKey: 'label.expired', value: 3 },
            {
              labelKey: 'label.expiring-soon',
              value: 25,
            },
          ]}
        />
      </Grid>
    </Grid>
  </Widget>
);
