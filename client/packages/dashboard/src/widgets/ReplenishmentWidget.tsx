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
import { useDashboard } from '../api';
import { useInbound } from '@openmsupply-client/invoices';
import { InternalSupplierSearchModal } from '@openmsupply-client/system';

export const ReplenishmentWidget: React.FC<PropsWithChildrenOnly> = () => {
  const modalControl = useToggle(false);
  const { error: errorNotification } = useNotification();
  const t = useTranslation('dashboard');
  const formatNumber = useFormatNumber();
  const { data, isLoading, isError, error } = useDashboard.statistics.inbound();
  const {
    data: requisitionCount,
    isLoading: isRequisitionCountLoading,
    isError: isRequisitionCountError,
    error: requisitionCountError,
  } = useDashboard.statistics.requisitions();

  const { mutateAsync: onCreate } = useInbound.document.insert();
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
      <Widget title={t('replenishment', { ns: 'app' })}>
        <Grid
          container
          justifyContent="flex-start"
          flex={1}
          flexDirection="column"
        >
          <Grid item>
            <StatsPanel
              error={error as ApiException}
              isError={isError}
              isLoading={isLoading}
              title={t('inbound-shipments', { ns: 'app' })}
              stats={[
                {
                  label: t('label.today', { ns: 'dashboard' }),
                  value: formatNumber.round(data?.today),
                },
                {
                  label: t('label.this-week', { ns: 'dashboard' }),
                  value: formatNumber.round(data?.thisWeek),
                },
                {
                  label: t('label.inbound-not-delivered', { ns: 'dashboard' }),
                  value: formatNumber.round(data?.notDelivered),
                },
              ]}
            />
          </Grid>
          <Grid item>
            <StatsPanel
              error={requisitionCountError as ApiException}
              isError={isRequisitionCountError}
              isLoading={isRequisitionCountLoading}
              title={t('internal-order', { ns: 'app' })}
              stats={[
                {
                  label: t('label.new'),
                  value: formatNumber.round(requisitionCount?.request?.draft),
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
