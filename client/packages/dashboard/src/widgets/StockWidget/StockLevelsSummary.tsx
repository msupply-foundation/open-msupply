import React from 'react';
import {
  ApiException,
  RouteBuilder,
  StatsPanel,
  useFormatNumber,
  usePreferences,
  useTranslation,
} from '@openmsupply-client/common';
import { useDashboard } from '../../api';
import { AppRoute } from '@openmsupply-client/config';

const LOW_MOS_THRESHOLD = 3;

export const StockLevelsSummary = () => {
  const t = useTranslation();
  const formatNumber = useFormatNumber();
  const {
    numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts:
      monthsForOutOfStockCalc,
    numberOfMonthsThresholdToShowOverStockAlertsForProducts: overStockAlert,
  } = usePreferences();

  const {
    data: itemCountsData,
    error: itemCountsError,
    isLoading: isItemStatsLoading,
    isError: hasItemStatsError,
  } = useDashboard.statistics.item(LOW_MOS_THRESHOLD);

  return (
    <StatsPanel
      error={itemCountsError as ApiException}
      isError={hasItemStatsError}
      isLoading={isItemStatsLoading}
      title={t('heading.stock-levels')}
      stats={[
        {
          label: t('label.total-items', {
            count: Math.round(itemCountsData?.total || 0),
          }),
          value: formatNumber.round(itemCountsData?.total || 0),
          link: RouteBuilder.create(AppRoute.Catalogue)
            .addPart(AppRoute.Items)
            .build(),
        },
        {
          label: t('label.items-no-stock', {
            count: Math.round(itemCountsData?.noStock || 0),
          }),
          value: formatNumber.round(itemCountsData?.noStock || 0),
          link: RouteBuilder.create(AppRoute.Catalogue)
            .addPart(AppRoute.Items)
            .addQuery({
              hasStockOnHand: 'false',
            })
            .build(),
        },
        {
          label: t('label.low-stock-items', {
            count: Math.round(itemCountsData?.lowStock || 0),
          }),
          value: formatNumber.round(itemCountsData?.lowStock || 0),
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
                value: formatNumber.round(
                  itemCountsData?.productsOverstocked || 0
                ),
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
            count: Math.round(itemCountsData?.moreThanSixMonthsStock || 0),
          }),
          value: formatNumber.round(
            itemCountsData?.moreThanSixMonthsStock || 0
          ),
          link: RouteBuilder.create(AppRoute.Catalogue)
            .addPart(AppRoute.Items)
            .addQuery({
              minMonthsOfStock: 6,
            })
            .build(),
        },
        ...(monthsForOutOfStockCalc
          ? [
              {
                label: t('label.out-of-stock-products', {
                  count: Math.round(itemCountsData?.outOfStockProducts || 0),
                }),
                value: formatNumber.round(
                  itemCountsData?.outOfStockProducts || 0
                ),
                link: RouteBuilder.create(AppRoute.Catalogue)
                  .addPart(AppRoute.Items)
                  .addQuery({
                    outOfStockProducts: true,
                  })
                  .build(),
              },
              {
                label: t('label.products-at-risk-of-being-out-of-stock', {
                  count: Math.round(itemCountsData?.outOfStockProducts || 0),
                }),
                value: formatNumber.round(
                  itemCountsData?.productsAtRiskOfBeingOutOfStock || 0
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
