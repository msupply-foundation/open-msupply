import React from 'react';
import { Grid } from '@openmsupply-client/common';
import {
  DistributionWidget,
  ReplenishmentWidget,
  StockWidget,
} from './widgets';
import { useDashboardWidgets } from './hooks';

const Dashboard: React.FC = () => {
  const coreWidgets = [
    <ReplenishmentWidget key="replenishment" widgetContext={'replenishment'} />,
    <DistributionWidget key="distribution" widgetContext={'distribution'} />,
    <StockWidget key="stock" widgetContext={'stock'} />,
  ];

  const widgets = useDashboardWidgets(coreWidgets);

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
      {widgets}
    </Grid>
  );
};

export default Dashboard;
