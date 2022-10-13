import React from 'react';
import {
  ButtonWithIcon,
  FnUtils,
  Grid,
  PlusCircleIcon,
  StatsPanel,
  useNotification,
  useQuery,
  useToggle,
  Widget,
} from '@openmsupply-client/common';
import { useFormatNumber, useTranslation } from '@common/intl';
import { PropsWithChildrenOnly } from '@common/types';
import { useInbound } from '../api';
import { InternalSupplierSearchModal } from '@openmsupply-client/system';

export const InboundShipmentWidget: React.FC<PropsWithChildrenOnly> = () => {
  const modalControl = useToggle(false);
  const { error } = useNotification();
  const api = useInbound.utils.api();
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

  const { mutate: onCreate } = useInbound.document.insert();

  return (
    <>
      {modalControl.isOn ? (
        <InternalSupplierSearchModal
          open={modalControl.isOn}
          onClose={modalControl.toggleOff}
          onChange={async name => {
            modalControl.toggleOff();
            try {
              await onCreate({
                id: FnUtils.generateUUID(),
                otherPartyId: name?.id,
              });
            } catch (e) {
              const errorSnack = error(
                'Failed to create invoice! ' + (e as Error).message
              );
              errorSnack();
            }
          }}
        />
      ) : null}
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
              variant="contained"
              color="secondary"
              Icon={<PlusCircleIcon />}
              label={t('button.new-inbound-shipment')}
              onClick={modalControl.toggleOn}
            />
          </Grid>
        </Grid>
      </Widget>
    </>
  );
};
