import React from 'react';
import {
  Grid,
  StatsPanel,
  useFormatNumber,
  useTranslation,
  usePreferences,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useItem } from '../../api';
import { AppRoute } from '@openmsupply-client/config';

export const Statistics = () => {
  const t = useTranslation();
  const formatNumber = useFormatNumber();
  const {
    byId: { data },
  } = useItem();
  const { manageVaccinesInDoses } = usePreferences();
  const { stats, isVaccine, doses } = data || {};

  const widgetContext = 'item-details';
  const stockOnHandPanelContext = 'stock-on-hand';
  const AMCPanelContext = 'amc';
  const monthsOfStockPanelContext = 'months-of-stock';

  if (!stats) return null;

  const getDosesMessage = (quan: number) => {
    if (!manageVaccinesInDoses || !isVaccine || !doses) return '';

    const doseCount = formatNumber.round(doses * quan);
    return `${doseCount} ${t('label.doses').toLowerCase()}`;
  };

  return (
    <Grid
      flex={1}
      alignItems="center"
      gap={1}
      justifyContent="center"
      display="flex"
    >
      <StatsPanel
        title={t('title.stock-on-hand')}
        panelContext={`${widgetContext}-${stockOnHandPanelContext}`}
        isLoading={false}
        stats={[
          {
            label: t('label.units'),
            value: formatNumber.round(stats.stockOnHand),
            extraMessage: getDosesMessage(stats.stockOnHand),
            statContext: `${widgetContext}-${stockOnHandPanelContext}-units`,
          },
        ]}
        link={
          data?.code &&
          RouteBuilder.create(AppRoute.Inventory)
            .addPart(AppRoute.Stock)
            .addQuery({
              search: data?.code,
            })
            .build()
        }
        width={300}
      />
      <StatsPanel
        isLoading={false}
        title={t('title.average-monthly-consumption')}
        panelContext={`${widgetContext}-${AMCPanelContext}`}
        stats={[
          {
            label: t('label.units'),
            value: formatNumber.round(stats.averageMonthlyConsumption, 2),
            extraMessage: getDosesMessage(stats.averageMonthlyConsumption),
            statContext: `${widgetContext}-${AMCPanelContext}-units`,
          },
        ]}
        width={300}
      />
      <StatsPanel
        isLoading={false}
        title={t('title.months-of-stock')}
        panelContext={`${widgetContext}-${monthsOfStockPanelContext}`}
        stats={[
          {
            label: t('text.months'),
            value: formatNumber.round(stats?.monthsOfStockOnHand ?? 0, 2),
            statContext: `${widgetContext}-${monthsOfStockPanelContext}-months`,
          },
        ]}
        width={300}
      />
    </Grid>
  );
};
