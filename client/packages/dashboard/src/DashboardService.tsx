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
    <Grid container justifyContent="flex-start" sx={{ height: '100%' }}>
      <Grid item>
        <StatsPanel
          titleKey="app.inbound-shipments"
          stats={[
            { labelKey: 'label.today', value: 5 },
            { labelKey: 'label.this-week', value: 53 },
          ]}
        />
      </Grid>
      <Grid item flex={1} sx={{ verticalAlign: 'bottom' }}>
        <Grid container>
          <ButtonWithIcon
            Icon={<PlusCircleIcon />}
            labelKey="button.new-inbound-shipment"
            onClick={() => alert('create')}
          />
        </Grid>
      </Grid>
    </Grid>
  </Widget>
);

const StockWidget = () => <Widget titleKey="app.stock"></Widget>;

const Dashboard: React.FC = () => (
  <Grid
    container
    sx={{ backgroundColor: 'background.toolbar', padding: '32px' }}
    spacing="22px"
  >
    <InboundShipmentsWidget />
    <OutboundShipmentsWidget />
    <StockWidget />
  </Grid>
);

export default Dashboard;
