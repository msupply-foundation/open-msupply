import React from 'react';
import {
  ButtonWithIcon,
  FnUtils,
  Grid,
  PlusCircleIcon,
  StatsPanel,
  useNotification,
  useToggle,
  Widget,
} from '@openmsupply-client/common';
import { useFormatNumber, useTranslation } from '@common/intl';
import { PropsWithChildrenOnly } from '@common/types';
import { useInbound } from '../api';
import { InternalSupplierSearchModal } from '@openmsupply-client/system';

export const InboundShipmentWidget: React.FC<PropsWithChildrenOnly> = () => {
  const modalControl = useToggle(false);
  const { error: errorNotification } = useNotification();
  const t = useTranslation(['app', 'dashboard']);
  const formatNumber = useFormatNumber();
  const { data, isLoading, isError, error } = useInbound.utils.counts();

  const { mutateAsync: onCreate } = useInbound.document.insert();
  const onError = (e: unknown) => {
    const message = (e as Error).message ?? '';
    const errorSnack = errorNotification(
      `Failed to create requisition! ${message}`
    );
    errorSnack();
  };

  return (
    <>
      {modalControl.isOn ? (
        <InternalSupplierSearchModal
          open={true}
          onClose={modalControl.toggleOff}
          onChange={async ({ id: otherPartyId }) => {
            modalControl.toggleOff();
            await onCreate(
              {
                id: FnUtils.generateUUID(),
                otherPartyId,
              },
              { onError }
            );
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
            <StatsPanel
              error={error}
              isError={isError}
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
