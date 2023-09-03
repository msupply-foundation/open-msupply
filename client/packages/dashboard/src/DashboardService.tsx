import React from 'react';
import {
  Grid,
  PluginArea,
  PluginType,
  usePluginElements,
} from '@openmsupply-client/common';
import {
  DistributionWidget,
  ReplenishmentWidget,
  StockWidget,
} from './widgets';

const Dashboard: React.FC = () => {
  const plugins = usePluginElements({
    area: PluginArea.DashboardWidget,
    type: PluginType.Dashboard,
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
