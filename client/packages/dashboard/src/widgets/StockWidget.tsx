import React from 'react';
import {
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
  RouteBuilder,
  StatsPanel,
  useNavigate,
  useTranslation,
  Widget,
} from '@openmsupply-client/common';
import { useItemStats, useStockCounts } from '../api';
import { AppRoute } from '@openmsupply-client/config';

const LOW_MOS_THRESHOLD = 3;

export const StockWidget: React.FC = () => {
  const t = useTranslation(['dashboard']);
  const navigate = useNavigate();
  const { data: expiryData, isLoading: isExpiryLoading } = useStockCounts();
  const { data: itemStatsData, isLoading: isItemStatsLoading } = useItemStats();

  const lowStockItemsCount =
    itemStatsData?.filter(
      item =>
        item.stats.availableStockOnHand > 0 &&
        (item.stats.availableMonthsOfStockOnHand ?? 0) < LOW_MOS_THRESHOLD
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
        <Grid
          item
          flex={1}
          container
          justifyContent="flex-end"
          alignItems="flex-end"
        >
          <ButtonWithIcon
            variant="contained"
            color="secondary"
            Icon={<PlusCircleIcon />}
            label={t('button.order-more')}
            onClick={() =>
              navigate(
                RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InternalOrder)
                  .build()
              )
            }
          />
        </Grid>
      </Grid>
    </Widget>
  );
};
