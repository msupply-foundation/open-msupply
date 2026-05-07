import React from 'react';
import { Box } from '@openmsupply-client/common';
import { isForecastSnapshotError } from '../../../../common/ForecastCalculationDisplay';
import { DraftRequestLine } from '../hooks';
import { StockDistribution } from './StockDistribution';
import { ConsumptionHistory } from './ConsumptionHistory';
import { StockEvolution } from './StockEvolution';

export interface RequestStatsProps {
  draft?: DraftRequestLine | null;
  expectedDeliveryDate?: string | null;
  minMonthsOfStock: number;
  maxMonthsOfStock: number;
}

export const RequestStats = ({
  draft,
  expectedDeliveryDate,
  minMonthsOfStock,
  maxMonthsOfStock,
}: RequestStatsProps) => {
  const forecastFailed = isForecastSnapshotError(draft?.forecastData);
  const displayForecasting = !!draft?.forecastMethod;
  const monthlyUsage: number | null = forecastFailed
    ? null
    : displayForecasting
      ? (draft?.forecastMonthlyUsage ?? null)
      : (draft?.itemStats?.averageMonthlyConsumption ?? null);

  return (
    <Box
      sx={{
        minHeight: 200,
        maxHeight: 500,
        width: 500,
      }}
    >
      {!!draft && (
        <StockDistribution
          availableStockOnHand={draft?.itemStats?.availableStockOnHand}
          averageMonthlyConsumption={
            draft?.itemStats?.averageMonthlyConsumption
          }
          suggestedQuantity={draft?.suggestedQuantity}
        />
      )}
      <Box
        display="flex"
        sx={{ paddingLeft: 2, paddingRight: 2 }}
        flexDirection="column"
        justifyContent="space-between"
      >
        {draft?.isCreated ? (
          <Box display="flex" height={289} />
        ) : (
          <>
            <Box paddingBottom={2}>
              <ConsumptionHistory
                id={draft?.id || ''}
                monthlyUsage={monthlyUsage}
              />
            </Box>
            <StockEvolution
              id={draft?.id || ''}
              monthlyUsage={monthlyUsage}
              requestedQuantity={draft?.requestedQuantity ?? 0}
              expectedDeliveryDate={expectedDeliveryDate}
              availableStockOnHand={draft?.itemStats?.availableStockOnHand ?? 0}
              minMonthsOfStock={minMonthsOfStock}
              maxMonthsOfStock={maxMonthsOfStock}
            />
          </>
        )}
      </Box>
    </Box>
  );
};
