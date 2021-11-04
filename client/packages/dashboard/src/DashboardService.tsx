import React from 'react';
import {
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import Widget from './Widget';
import { StatsPanel } from './StatsPanel';
import { OutboundShipmentsWidget } from './OutboundShipmentsWidget';

const InboundShipmentsWidget = () => (
  <Widget titleKey="app.inbound-shipments">
    <Grid container justifyContent="flex-start" flex={1}>
      <Grid item>
        <StatsPanel
          titleKey="app.inbound-shipments"
          stats={[
            { labelKey: 'label.today', value: 5 },
            { labelKey: 'label.this-week', value: 53 },
          ]}
        />
      </Grid>
      <Grid
        item
        flex={1}
        container
        justifyContent="flex-end"
        alignItems="flex-end"
      >
        <ButtonWithIcon
          disabled
          variant="contained"
          color="secondary"
          Icon={<PlusCircleIcon />}
          labelKey="button.new-inbound-shipment"
          onClick={() => alert('create')}
        />
      </Grid>
    </Grid>
  </Widget>
);

const StockWidget = () => <Widget titleKey="app.stock"></Widget>;

const Dashboard: React.FC = () => (
  <Grid
    container
    sx={{ backgroundColor: 'background.toolbar', padding: '32px' }}
  >
    <InboundShipmentsWidget />
    <OutboundShipmentsWidget />
    <StockWidget />
  </Grid>
);

export default Dashboard;
