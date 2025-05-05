import React from 'react';
import { Box, Paper } from '@openmsupply-client/common';
import { DraftRequestLine } from '../hooks';
import { ConsumptionHistory } from './ConsumptionHistory';

export interface RequestStatsProps {
  draft?: DraftRequestLine | null;
}

export const RequestStats = ({ draft }: RequestStatsProps) => {
  const chartKey = draft
    ? `${draft.id}-${draft.requestedQuantity}`
    : 'no-draft';

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
      <Box
        display="flex"
        sx={{ paddingLeft: 2, paddingRight: 2 }}
        flexDirection="column"
        justifyContent="space-between"
      >
        <ConsumptionHistory key={chartKey} id={draft?.id || ''} />
      </Box>
    </Paper>
  );
};
