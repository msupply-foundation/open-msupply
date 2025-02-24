import React from 'react';
import { Grid, usePluginProvider } from '@openmsupply-client/common';
import {
  DistributionWidget,
  ReplenishmentWidget,
  StockWidget,
} from './widgets';

const Dashboard: React.FC = () => {
  const { plugins } = usePluginProvider();

  return (
    <Grid
      container
      sx={{
        backgroundColor: 'background.toolbar',
        paddingBottom: '32px',
        width: '100%',
      }}
      justifyContent="space-evenly"
    >
      <ReplenishmentWidget />
      <DistributionWidget />
      <StockWidget />
      {plugins.dashboard?.map((Plugin, index) => <Plugin key={index} />)}
    </Grid>
  );
};

export default Dashboard;
