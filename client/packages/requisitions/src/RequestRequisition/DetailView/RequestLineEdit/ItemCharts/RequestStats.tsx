import React from 'react';
import { Box } from '@openmsupply-client/common';
import { DraftRequestLine } from '../hooks';
import { StockDistribution } from './StockDistribution';
import { ConsumptionHistory } from './ConsumptionHistory';
import { StockEvolution } from './StockEvolution';

export interface RequestStatsProps {
  draft?: DraftRequestLine | null;
}

export const RequestStats = ({ draft }: RequestStatsProps) => {
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
              <ConsumptionHistory id={draft?.id || ''} />
            </Box>
            <StockEvolution id={draft?.id || ''} />
          </>
        )}
      </Box>
    </Box>
  );
};
