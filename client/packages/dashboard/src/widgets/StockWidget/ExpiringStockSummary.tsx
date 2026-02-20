import React from 'react';
import {
  ApiException,
  DateUtils,
  RANGE_SPLIT_CHAR,
  RouteBuilder,
  StatsPanel,
  useFormatDateTime,
  useFormatNumber,
  usePreferences,
  useTranslation,
} from '@openmsupply-client/common';

import { AppRoute } from '@openmsupply-client/config';
import { useStockCounts } from '../../api';

const DAYS_TILL_EXPIRY = 30;

interface ExpiringStockSummaryProps {
  panelContext: string;
}

export const ExpiringStockSummary = ({
  panelContext,
}: ExpiringStockSummaryProps) => {
  const t = useTranslation();
  const formatNumber = useFormatNumber();

  const {
    firstThresholdForExpiringItems: firstThreshold,
    secondThresholdForExpiringItems: secondThreshold,
  } = usePreferences();

  const { stats, isLoading, isError, error } = useStockCounts(DAYS_TILL_EXPIRY);

  const { customDate, urlQueryDate, formatDaysFromToday } = useFormatDateTime();
  const today = new Date();
  const inAMonth = DateUtils.addMonths(today, 1);

  const getExpiredUrlQuery = `${RANGE_SPLIT_CHAR}${customDate(
    today,
    urlQueryDate
  )}`;
  const getExpiredInAMonthUrlQuery = `${customDate(
    today,
    urlQueryDate
  )}${RANGE_SPLIT_CHAR}${customDate(inAMonth, urlQueryDate)}`;

  const haveThreshold =
    (firstThreshold && firstThreshold > 0) ||
    (secondThreshold && secondThreshold > 0);

  const getBatchesExpiryDateRange = (first: number, second: number): string =>
    `${formatDaysFromToday(first)}_${formatDaysFromToday(second)}`;

  return (
    <StatsPanel
      error={error as ApiException}
      isError={isError}
      isLoading={isLoading}
      title={t('heading.expiring-stock')}
      panelContext={panelContext}
      stats={[
        {
          label: t('label.expired', {
            count: Math.round(stats?.expired || 0),
          }),
          value: formatNumber.round(stats?.expired),
          link: RouteBuilder.create(AppRoute.Inventory)
            .addPart(AppRoute.Stock)
            .addQuery({
              expiryDate: getExpiredUrlQuery,
            })
            .build(),
          statContext: `${panelContext}-expired`,
        },
        {
          label: t('label.expiring-soon', {
            count: Math.round(stats?.expiringSoon || 0),
          }),
          value: formatNumber.round(stats?.expiringSoon),
          link: RouteBuilder.create(AppRoute.Inventory)
            .addPart(AppRoute.Stock)
            .addQuery({
              expiryDate: getExpiredInAMonthUrlQuery,
            })
            .build(),
          statContext: `${panelContext}-expiring-soon`,
        },
        {
          label: t('label.batches-expiring-between-days'),
          value: formatNumber.round(stats?.expiringInNextThreeMonths),
          link: RouteBuilder.create(AppRoute.Inventory)
            .addPart(AppRoute.Stock)
            .addQuery({
              expiryDate: getBatchesExpiryDateRange(30, 89), // Note this is between 30 and 90 days to exclude the 90th day we only use 89. This aligns with he backend filter `expiring_in_next_three_months` server/graphql/general/src/queries/stock_counts.rs
            })
            .build(),
          statContext: `${panelContext}-batches-expiring-between-days`,
        },
        ...(haveThreshold
          ? [
              {
                label: t('label.batches-expiring-in-days', {
                  firstThreshold,
                  secondThreshold,
                }),
                value: formatNumber.round(stats?.expiringBetweenThresholds),
                link: RouteBuilder.create(AppRoute.Inventory)
                  .addPart(AppRoute.Stock)
                  .addQuery({
                    expiryDate: getBatchesExpiryDateRange(
                      firstThreshold ?? 0,
                      secondThreshold ?? 0
                    ),
                  })
                  .build(),
                statContext: `${panelContext}-batches-expiring-in-days`,
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
