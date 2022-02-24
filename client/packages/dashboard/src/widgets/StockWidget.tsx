import React from 'react';
import {
  Grid,
  StatsPanel,
  useTranslation,
  Widget,
} from '@openmsupply-client/common';
import { useItemStats, useStockCounts } from '../api';

const LOW_MOS_THRESHOLD = 3;

export const StockWidget: React.FC = () => {
  const t = useTranslation(['dashboard']);
  const { data: expiryData, isLoading: isExpiryLoading } = useStockCounts();
  const { data: itemStatsData, isLoading: isItemStatsLoading } = useItemStats();

  const lowStockItemsCount =
    itemStatsData?.filter(
      item =>
        item.stats.availableStockOnHand > 0 &&
        item.stats.availableMonthsOfStockOnHand <= LOW_MOS_THRESHOLD
    ).length || 0;

  const noStockItemsCount =
    itemStatsData?.filter(item => item.stats.availableStockOnHand === 0)
      .length || 0;

  return (
    <Widget title={t('heading-stock')}>
      <Grid
        container
        justifyContent="flex-start"
        flex={1}
        flexDirection="column"
      >
        <Grid item>
          <StatsPanel
            isLoading={isExpiryLoading}
            title={t('heading.expiring-stock')}
            stats={[
              {
                label: t('label.expired', { ns: 'dashboard' }),
                value: expiryData?.expired || 0,
              },
              {
                label: t('label.expiring-soon'),
                value: expiryData?.expiringSoon || 0,
              },
            ]}
          />
          <StatsPanel
            isLoading={isItemStatsLoading}
            title={t('heading.stock-levels')}
            stats={[
              {
                label: t('label.total-items', { ns: 'dashboard' }),
                value: itemStatsData?.length || 0,
              },
              {
                label: t('label.items-no-stock'),
                value: noStockItemsCount,
              },
              {
                label: t('label.low-stock-items'),
                value: lowStockItemsCount,
              },
            ]}
          />
        </Grid>
      </Grid>
    </Widget>
  );
};
