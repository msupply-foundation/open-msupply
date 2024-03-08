import React, { FC } from 'react';
import { useTranslation } from '@common/intl';
import { Grid, StatsPanel } from '@openmsupply-client/common';
import { useFormatNumber } from '@common/intl';
import { useItemFields } from '../../api';

interface Statistics {
  numberOfPacksFromQuantity: (totalQuantity: number) => number;
}

export const Statistics: FC<Statistics> = ({ numberOfPacksFromQuantity }) => {
  const t = useTranslation('catalogue');
  const formatNumber = useFormatNumber();
  const { stats } = useItemFields();

  if (!stats) return null;

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
            value: formatNumber.round(
              numberOfPacksFromQuantity(stats.availableStockOnHand)
            ),
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
            value: formatNumber.round(
              numberOfPacksFromQuantity(stats.averageMonthlyConsumption),
              2
            ),
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
            value: formatNumber.round(
              numberOfPacksFromQuantity(
                stats?.availableMonthsOfStockOnHand ?? 0
              ),
              2
            ),
          },
        ]}
        title={t('title.months-of-stock')}
        width={300}
      />
    </Grid>
  );
};
