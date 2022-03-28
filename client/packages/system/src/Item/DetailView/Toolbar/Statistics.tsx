import React from 'react';
import { useTranslation } from '@common/intl';
import { Grid, StatsPanel } from '@openmsupply-client/common';
import { useItemFields } from '../../api';

export const Statistics = () => {
  const t = useTranslation('catalogue');
  const { stats } = useItemFields();

  if (!stats) return null;

  return (
    <Grid
      flex={1}
      alignItems="center"
      gap={1}
      justifyContent="center"
      display="flex"
      flexWrap="wrap"
    >
      <StatsPanel
        isLoading={false}
        stats={[
          {
            label: t('label.units'),
            value: stats?.availableStockOnHand ?? 0,
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
            value: stats?.averageMonthlyConsumption ?? 0,
          },
        ]}
        title={t('title.amc')}
        width={300}
      />
      <StatsPanel
        isLoading={false}
        stats={[
          {
            label: t('label.months'),
            value: stats?.availableMonthsOfStockOnHand ?? 0,
          },
        ]}
        title={t('title.months-of-stock')}
        width={300}
      />
    </Grid>
  );
};
