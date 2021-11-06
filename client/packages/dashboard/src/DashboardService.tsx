import React from 'react';
import { Grid } from '@openmsupply-client/common';
import {
  InboundShipmentsWidget,
  OutboundShipmentsWidget,
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
    wrap="nowrap"
  >
    <InboundShipmentsWidget />
    <OutboundShipmentsWidget />
    <StockWidget />
  </Grid>
);

export default Dashboard;
