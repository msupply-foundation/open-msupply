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
import { useDashboard } from '../../api';
import { AppRoute } from '@openmsupply-client/config';

const LOW_MOS_THRESHOLD = 3;

interface StockLevelsSummaryProps {
  widgetContext: string;
}

export const StockLevelsSummary = ({
  widgetContext,
}: StockLevelsSummaryProps) => {
  const t = useTranslation();
  const formatNumber = useFormatNumber();
  const queryClient = useQueryClient();
  const dashboardApi = useDashboard.utils.api();
  const {
    numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts:
      outOfStockProducts,
    numberOfMonthsThresholdToShowOverStockAlertsForProducts: overStockAlert,
    numberOfMonthsThresholdToShowLowStockAlertsForProducts: lowStockAlert,
  } = usePreferences();

  const stockLevelsPanelContext = 'stock-levels';

  const {
    data: itemCountsData,
    error: itemCountsError,
    isLoading: isItemStatsLoading,
    isError: hasItemStatsError,
  } = useDashboard.statistics.item(LOW_MOS_THRESHOLD);

  useEffect(() => {
    queryClient.invalidateQueries(dashboardApi.keys.items());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outOfStockProducts, lowStockAlert, overStockAlert]);

  return (
    <StatsPanel
      error={itemCountsError as ApiException}
      isError={hasItemStatsError}
      isLoading={isItemStatsLoading}
      title={t('heading.stock-levels')}
      panelContext={`${widgetContext}-${stockLevelsPanelContext}`}
      stats={[
        {
          label: t('label.total-items', {
            count: Math.round(itemCountsData?.total || 0),
          }),
          value: formatNumber.round(itemCountsData?.total || 0),
          link: RouteBuilder.create(AppRoute.Catalogue)
            .addPart(AppRoute.Items)
            .build(),
          statContext: `${widgetContext}-${stockLevelsPanelContext}-total-items`,
        },
        {
          label: t('label.items-no-stock', {
            count: Math.round(itemCountsData?.noStock || 0),
          }),
          value: formatNumber.round(itemCountsData?.noStock || 0),
          link: RouteBuilder.create(AppRoute.Catalogue)
            .addPart(AppRoute.Items)
            .addQuery({
              stockStatus: 'outOfStock',
            })
            .build(),
          statContext: `${widgetContext}-${stockLevelsPanelContext}-items-no-stock`,
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
          statContext: `${widgetContext}-${stockLevelsPanelContext}-low-stock-items`,
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
                statContext: `${widgetContext}-${stockLevelsPanelContext}-overstocked-products`,
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
          statContext: `${widgetContext}-${stockLevelsPanelContext}-over-six-months-stock`,
        },
        ...(outOfStockProducts
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
                    stockStatus: 'outOfStockWithRecentConsumption',
                  })
                  .build(),
                statContext: `${widgetContext}-${stockLevelsPanelContext}-out-of-stock-products`,
              },
            ]
          : []),
        ...(lowStockAlert
          ? [
              {
                label: t('label.products-at-risk-of-being-out-of-stock', {
                  count: Math.round(
                    itemCountsData?.productsAtRiskOfBeingOutOfStock || 0
                  ),
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
                statContext: `${widgetContext}-${stockLevelsPanelContext}-products-at-risk-of-stockout`,
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
