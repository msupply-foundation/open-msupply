import React from 'react';
import {
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
  useOmSupplyApi,
  useQuery,
} from '@openmsupply-client/common';
import Widget from './Widget';
import { StatsPanel } from '../StatsPanel';
import { getInboundShipmentCountQueryFn } from '../api';

export const InboundShipmentsWidget: React.FC = () => {
  const { api } = useOmSupplyApi();
  const { data, isLoading } = useQuery(
    ['inbound-shipment', 'count'],
    getInboundShipmentCountQueryFn(api),
    { retry: false }
  );

  return (
    <Widget titleKey="app.inbound-shipments">
      <Grid
        container
        justifyContent="flex-start"
        flex={1}
        flexDirection="column"
      >
        <Grid item>
          <StatsPanel
            isLoading={isLoading}
            titleKey="app.inbound-shipments"
            stats={[
              { labelKey: 'label.today', value: data?.today ?? 0 },
              { labelKey: 'label.this-week', value: data?.thisWeek ?? 0 },
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
};
