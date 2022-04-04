import React from 'react';
import {
  ButtonWithIcon,
  Formatter,
  Grid,
  PlusCircleIcon,
  StatsPanel,
  useQuery,
  useTranslation,
  Widget,
} from '@openmsupply-client/common';
import { useInboundApi } from '../api';

export const InboundShipmentWidget: React.FC = () => {
  const api = useInboundApi();
  const t = useTranslation(['app', 'dashboard']);
  const { data, isLoading } = useQuery(
    ['inbound-shipment', 'count'],
    api.dashboard.shipmentCount,
    {
      retry: false,
    }
  );

  return (
    <Widget title={t('inbound-shipments')}>
      <Grid
        container
        justifyContent="flex-start"
        flex={1}
        flexDirection="column"
      >
        <Grid item>
          <StatsPanel
            isLoading={isLoading}
            title={t('inbound-shipments')}
            stats={[
              {
                label: t('label.today', { ns: 'dashboard' }),
                value: Formatter.round(data?.today),
              },
              {
                label: t('label.this-week', { ns: 'dashboard' }),
                value: Formatter.round(data?.thisWeek),
              },
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
            label={t('button.new-inbound-shipment')}
            onClick={() => alert('create')}
          />
        </Grid>
      </Grid>
    </Widget>
  );
};
