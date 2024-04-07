import React from 'react';
import { Grid, usePluginElements } from '@openmsupply-client/common';
import {
  DistributionWidget,
  ReplenishmentWidget,
  StockWidget,
} from './widgets';

const Dashboard: React.FC = () => {
  const plugins = usePluginElements({
    type: 'Dashboard',
  });

  return (
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
      {plugins}
    </Grid>
  );
};

export default Dashboard;
