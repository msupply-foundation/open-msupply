import React, { useEffect } from 'react';
import {
  ApiException,
  RouteBuilder,
  StatsPanel,
  useFormatNumber,
  usePreferences,
  useQueryClient,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useItemCounts } from '../../api';
import { DASHBOARD, ITEMS } from '../../api/hooks/keys';

const LOW_MOS_THRESHOLD = 3;

export const StockLevelsSummary = () => {
  const t = useTranslation();
  const formatNumber = useFormatNumber();
  const queryClient = useQueryClient();
  const {
    numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts:
      outOfStockProducts,
    numberOfMonthsThresholdToShowOverStockAlertsForProducts: overStockAlert,
    numberOfMonthsThresholdToShowLowStockAlertsForProducts: lowStockAlert,
  } = usePreferences();

  const { stats, error, isLoading, isError } = useItemCounts(LOW_MOS_THRESHOLD);

  useEffect(() => {
    queryClient.invalidateQueries([DASHBOARD, ITEMS]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outOfStockProducts, lowStockAlert, overStockAlert]);

  return (
    <StatsPanel
      error={error as ApiException}
      isError={isError}
      isLoading={isLoading}
      title={t('heading.stock-levels')}
      stats={[
        {
          label: t('label.total-items', {
            count: Math.round(stats?.total || 0),
          }),
          value: formatNumber.round(stats?.total || 0),
          link: RouteBuilder.create(AppRoute.Catalogue)
            .addPart(AppRoute.Items)
            .build(),
        },
        {
          label: t('label.items-no-stock', {
            count: Math.round(stats?.noStock || 0),
          }),
          value: formatNumber.round(stats?.noStock || 0),
          link: RouteBuilder.create(AppRoute.Catalogue)
            .addPart(AppRoute.Items)
            .addQuery({
              stockStatus: 'outOfStock',
            })
            .build(),
        },
        {
          label: t('label.low-stock-items', {
            count: Math.round(stats?.lowStock || 0),
          }),
          value: formatNumber.round(stats?.lowStock || 0),
          link: RouteBuilder.create(AppRoute.Catalogue)
            .addPart(AppRoute.Items)
            .addQuery({
              maxMonthsOfStock: 3,
            })
            .build(),
        },
        ...(overStockAlert
          ? [
              {
                label: t('label.overstocked-products', {
                  num: overStockAlert,
                }),
                value: formatNumber.round(stats?.productsOverstocked || 0),
                link: RouteBuilder.create(AppRoute.Catalogue)
                  .addPart(AppRoute.Items)
                  .addQuery({
                    minMonthsOfStock: overStockAlert,
                  })
                  .build(),
              },
            ]
          : []),
        {
          label: t('label.more-than-six-months-stock-items', {
            count: Math.round(stats?.moreThanSixMonthsStock || 0),
          }),
          value: formatNumber.round(stats?.moreThanSixMonthsStock || 0),
          link: RouteBuilder.create(AppRoute.Catalogue)
            .addPart(AppRoute.Items)
            .addQuery({
              minMonthsOfStock: 6,
            })
            .build(),
        },
        ...(outOfStockProducts
          ? [
              {
                label: t('label.out-of-stock-products', {
                  count: Math.round(stats?.outOfStockProducts || 0),
                }),
                value: formatNumber.round(stats?.outOfStockProducts || 0),
                link: RouteBuilder.create(AppRoute.Catalogue)
                  .addPart(AppRoute.Items)
                  .addQuery({
                    stockStatus: 'outOfStockWithRecentConsumption',
                  })
                  .build(),
              },
            ]
          : []),
        ...(lowStockAlert
          ? [
              {
                label: t('label.products-at-risk-of-being-out-of-stock', {
                  count: Math.round(
                    stats?.productsAtRiskOfBeingOutOfStock || 0
                  ),
                }),
                value: formatNumber.round(
                  stats?.productsAtRiskOfBeingOutOfStock || 0
                ),
                link: RouteBuilder.create(AppRoute.Catalogue)
                  .addPart(AppRoute.Items)
                  .addQuery({
                    productsAtRiskOfBeingOutOfStock: true,
                  })
                  .build(),
              },
            ]
          : []),
      ]}
      link={RouteBuilder.create(AppRoute.Inventory)
        .addPart(AppRoute.Stock)
        .build()}
    />
  );
};
