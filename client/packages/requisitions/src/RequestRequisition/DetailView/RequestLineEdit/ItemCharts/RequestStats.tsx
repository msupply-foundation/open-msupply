import React from 'react';
import { Box, Paper } from '@openmsupply-client/common';
import { DraftRequestLine } from '../hooks';
import { StockDistribution } from './StockDistribution';
import { ConsumptionHistory } from './ConsumptionHistory';
import { StockEvolution } from './StockEvolution';

export interface RequestStatsProps {
  draft?: DraftRequestLine | null;
}

export const RequestStats = ({ draft }: RequestStatsProps) => {
  return (
    <Paper
      sx={{
        mt: 2,
        p: 2,
        minHeight: 200,
        maxHeight: 500,
        width: '100%',
        overflow: 'auto',
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
        <Box paddingBottom={2}>
          <ConsumptionHistory id={draft?.id || ''} />
        </Box>
        <StockEvolution id={draft?.id || ''} />
      </Box>
    </Paper>
  );
};
