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
import { ApiException, PropsWithChildrenOnly } from '@common/types';
import { useDashboard } from './api';
import { useInboundShipment } from '@openmsupply-client/invoices';
import { InternalSupplierSearchModal } from '@openmsupply-client/system';

const ReplenishmentWidget: React.FC<PropsWithChildrenOnly> = () => {
  const modalControl = useToggle(false);
  const { error: errorNotification } = useNotification();
  const t = useTranslation();
  const formatNumber = useFormatNumber();
  const { data, isLoading, isError, error } = useDashboard.statistics.inbound();
  const {
    data: requisitionCount,
    isLoading: isRequisitionCountLoading,
    isError: isRequisitionCountError,
    error: requisitionCountError,
  } = useDashboard.statistics.requisitions();

  const {
    create: { create: onCreate },
  } = useInboundShipment();
  const onError = (e: unknown) => {
    const message = (e as Error).message ?? '';
    const errorSnack = errorNotification(
      t('error.failed-to-create-requisition', { message })
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
            try {
              await onCreate({
                id: FnUtils.generateUUID(),
                otherPartyId,
              });
            } catch (e) {
              onError(e);
            }
          }}
        />
      ) : null}
      <Widget title={t('replenishment')}>
        <Grid
          container
          justifyContent="flex-start"
          flex={1}
          flexDirection="column"
        >
          <Grid>
            <StatsPanel
              error={error as unknown as ApiException}
              isError={isError}
              isLoading={isLoading}
              title={t('inbound-shipment')}
              panelContext="inbound-shipment"
              stats={[
                {
                  label: t('label.today'),
                  value: formatNumber.round(data?.today),
                  statContext: 'inbound-today',
                },
                {
                  label: t('label.this-week'),
                  value: formatNumber.round(data?.thisWeek),
                  statContext: 'inbound-this-week',
                },
                {
                  label: t('label.inbound-not-delivered'),
                  value: formatNumber.round(data?.notDelivered),
                  statContext: 'inbound-not-delivered',
                },
              ]}
            />
          </Grid>
          <Grid>
            <StatsPanel
              error={requisitionCountError as unknown as ApiException}
              isError={isRequisitionCountError}
              isLoading={isRequisitionCountLoading}
              title={t('internal-order')}
              panelContext="internal-order"
              stats={[
                {
                  label: t('label.new'),
                  value: formatNumber.round(requisitionCount?.request?.draft),
                  statContext: 'internal-order-new',
                },
              ]}
            />
          </Grid>
          <Grid
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

export default ReplenishmentWidget;
