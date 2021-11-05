import React from 'react';
import {
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import Widget from './Widget';
import { StatsPanel } from '../StatsPanel';

export const InboundShipmentsWidget: React.FC = () => (
  <Widget titleKey="app.inbound-shipments">
    <Grid container justifyContent="flex-start" flex={1}>
      <Grid item>
        <StatsPanel
          titleKey="app.inbound-shipments"
          stats={[
            { labelKey: 'label.today', value: 8 },
            { labelKey: 'label.this-week', value: 88 },
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
