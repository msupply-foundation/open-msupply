import React from 'react';
import {
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
  StatsPanel,
  useQuery,
  Widget,
} from '@openmsupply-client/common';
import { useFormatNumber, useTranslation } from '@common/intl';
import { PropsWithChildrenOnly } from '@common/types';
import { useInboundApi } from '../api';

export const InboundShipmentWidget: React.FC<PropsWithChildrenOnly> = () => {
  const api = useInboundApi();
  const t = useTranslation(['app', 'dashboard']);
  const [hasError, setHasError] = React.useState(false);
  const formatNumber = useFormatNumber();
  const { data, isLoading } = useQuery(
    ['inbound-shipment', 'count'],
    api.dashboard.shipmentCount,
    {
      retry: false,
      onError: () => setHasError(true),
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
          {!hasError && (
            <StatsPanel
              isLoading={isLoading}
              title={t('inbound-shipments')}
              stats={[
                {
                  label: t('label.today', { ns: 'dashboard' }),
                  value: formatNumber.round(data?.today),
                },
                {
                  label: t('label.this-week', { ns: 'dashboard' }),
                  value: formatNumber.round(data?.thisWeek),
                },
              ]}
            />
          )}
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
