import React from 'react';
import {
  Grid,
  StatsPanel,
  useOmSupplyApi,
  useQuery,
  useTranslation,
  Widget,
} from '@openmsupply-client/common';
import { getStockCountQueryFn } from '../api';

export const StockWidget: React.FC = () => {
  const { api } = useOmSupplyApi();
  const t = useTranslation(['app', 'dashboard']);
  const { data, isLoading } = useQuery(
    ['stock', 'count'],
    getStockCountQueryFn(api),
    { retry: false }
  );

  return (
    <Widget title={t('stock')}>
      <Grid
        container
        justifyContent="flex-start"
        flex={1}
        flexDirection="column"
      >
        <Grid item>
          <StatsPanel
            isLoading={isLoading}
            title={t('heading.expiring-stock')}
            stats={[
              { label: t('label.expired'), value: data?.expired || 0 },
              {
                label: t('label.expiring-soon'),
                value: data?.expiringSoon || 0,
              },
            ]}
          />
        </Grid>
      </Grid>
    </Widget>
  );
};
