import React from 'react';
import { Grid, useOmSupplyApi, useQuery } from '@openmsupply-client/common';
import Widget from './Widget';
import { StatsPanel } from '../StatsPanel';
import { getStockCountQueryFn } from '../api';

export const StockWidget: React.FC = () => {
  const { api } = useOmSupplyApi();
  const { data, isLoading } = useQuery(
    ['stock', 'count'],
    getStockCountQueryFn(api),
    { retry: false }
  );

  return (
    <Widget titleKey="app.stock">
      <Grid
        container
        justifyContent="flex-start"
        flex={1}
        flexDirection="column"
      >
        <Grid item>
          <StatsPanel
            isLoading={isLoading}
            titleKey="heading.expiring-stock"
            stats={[
              { labelKey: 'label.expired', value: data?.expired || 0 },
              {
                labelKey: 'label.expiring-soon',
                value: data?.expiringSoon || 0,
              },
            ]}
          />
        </Grid>
      </Grid>
    </Widget>
  );
};
