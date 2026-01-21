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
import { useDashboard } from '../../api';
import { AppRoute } from '@openmsupply-client/config';

interface ExpiringStockSummaryProps {
  widgetContext: string;
}

export const ExpiringStockSummary = ({
  widgetContext,
}: ExpiringStockSummaryProps) => {
  const t = useTranslation();
  const formatNumber = useFormatNumber();

  const expiringStockPanelContext = 'expiring-stock';

  const {
    firstThresholdForExpiringItems: firstThreshold,
    secondThresholdForExpiringItems: secondThreshold,
  } = usePreferences();

  const {
    data: expiryData,
    error: expiryError,
    isLoading: isExpiryLoading,
    isError: hasExpiryError,
  } = useDashboard.statistics.stock();

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
      error={expiryError as ApiException}
      isError={hasExpiryError}
      isLoading={isExpiryLoading}
      title={t('heading.expiring-stock')}
      panelContext={`${widgetContext}-${expiringStockPanelContext}`}
      stats={[
        {
          label: t('label.expired', {
            count: Math.round(expiryData?.expired || 0),
          }),
          value: formatNumber.round(expiryData?.expired),
          link: RouteBuilder.create(AppRoute.Inventory)
            .addPart(AppRoute.Stock)
            .addQuery({
              expiryDate: getExpiredUrlQuery,
            })
            .build(),
          statContext: `${widgetContext}-${expiringStockPanelContext}-expired`,
        },
        {
          label: t('label.expiring-soon', {
            count: Math.round(expiryData?.expiringSoon || 0),
          }),
          value: formatNumber.round(expiryData?.expiringSoon),
          link: RouteBuilder.create(AppRoute.Inventory)
            .addPart(AppRoute.Stock)
            .addQuery({
              expiryDate: getExpiredInAMonthUrlQuery,
            })
            .build(),
          statContext: `${widgetContext}-${expiringStockPanelContext}-expiring-soon`,
        },
        {
          label: t('label.batches-expiring-between-days'),
          value: formatNumber.round(expiryData?.expiringInNextThreeMonths),
          link: RouteBuilder.create(AppRoute.Inventory)
            .addPart(AppRoute.Stock)
            .addQuery({
              expiryDate: getBatchesExpiryDateRange(30, 90),
            })
            .build(),
          statContext: `${widgetContext}-${expiringStockPanelContext}-batches-expiring-between-days`,
        },
        ...(haveThreshold
          ? [
              {
                label: t('label.batches-expiring-in-days', {
                  firstThreshold,
                  secondThreshold,
                }),
                value: formatNumber.round(
                  expiryData?.expiringBetweenThresholds
                ),
                link: RouteBuilder.create(AppRoute.Inventory)
                  .addPart(AppRoute.Stock)
                  .addQuery({
                    expiryDate: getBatchesExpiryDateRange(
                      firstThreshold ?? 0,
                      secondThreshold ?? 0
                    ),
                  })
                  .build(),
                statContext: `${widgetContext}-${expiringStockPanelContext}-batches-expiring-in-days`,
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
