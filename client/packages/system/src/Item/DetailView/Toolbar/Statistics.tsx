import React from 'react';
import { useTranslation } from '@common/intl';
import { Grid, StatsPanel, usePreferences } from '@openmsupply-client/common';
import { useFormatNumber } from '@common/intl';
import { useItemFields } from '../../api';

export const Statistics = () => {
  const t = useTranslation();
  const formatNumber = useFormatNumber();
  const { stats, isVaccine, doses } = useItemFields();
  const { manageVaccinesInDoses } = usePreferences();

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
        isLoading={false}
        stats={[
          {
            label: t('label.units'),
            value: formatNumber.round(stats.stockOnHand),
            extraMessage: getDosesMessage(stats.stockOnHand),
          },
        ]}
        title={t('title.stock-on-hand')}
        width={300}
      />
      <StatsPanel
        isLoading={false}
        stats={[
          {
            label: t('label.units'),
            value: formatNumber.round(stats.averageMonthlyConsumption, 2),
            extraMessage: getDosesMessage(stats.averageMonthlyConsumption),
          },
        ]}
        title={t('title.average-monthly-consumption')}
        width={300}
      />
      <StatsPanel
        isLoading={false}
        stats={[
          {
            label: t('text.months'),
            value: formatNumber.round(stats?.monthsOfStockOnHand ?? 0, 2),
          },
        ]}
        title={t('title.months-of-stock')}
        width={300}
      />
    </Grid>
  );
};
