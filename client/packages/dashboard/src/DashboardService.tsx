import React from 'react';
import { Grid } from '@openmsupply-client/common';
import {
  DistributionWidget,
  ReplenishmentWidget,
  StockWidget,
} from './widgets';

const Dashboard: React.FC = () => (
  <Grid
    container
    sx={{
      backgroundColor: 'background.toolbar',
      paddingBottom: '32px',
    }}
    justifyContent="space-evenly"
  >
    <ReplenishmentWidget />
    <DistributionWidget />
    <StockWidget />
  </Grid>
);

export default Dashboard;
