import React from 'react';
import { CustomerSearchModal } from '@openmsupply-client/system';
import {
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
  useNotification,
  StatsPanel,
  Widget,
  FnUtils,
  useToggle,
  ApiException,
} from '@openmsupply-client/common';
import { useFormatNumber, useTranslation } from '@common/intl';
import { useDashboard } from '../api';
import { useOutbound } from '@openmsupply-client/invoices';

export const DistributionWidget: React.FC = () => {
  const modalControl = useToggle(false);
  const { error: errorNotification } = useNotification();
  const t = useTranslation('dashboard');
  const formatNumber = useFormatNumber();
  const {
    data: outboundCount,
    isLoading: isOutboundCountLoading,
    isError: isOutboundCountError,
    error: outboundCountError,
  } = useDashboard.statistics.outbound();
  const {
    data: requisitionCount,
    isLoading: isRequisitionCountLoading,
    isError: isRequisitionCountError,
    error: requisitionCountError,
  } = useDashboard.statistics.requisitions();

  const { mutateAsync: onCreate } = useOutbound.document.insert();
  const onError = (e: unknown) => {
    const message = (e as Error).message ?? '';
    const errorSnack = errorNotification(
      `Failed to create invoice! ${message}`
    );
    errorSnack();
  };

  return (
    <>
      {modalControl.isOn ? (
        <CustomerSearchModal
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
      <Widget title={t('distribution', { ns: 'app' })}>
        <Grid
          container
          justifyContent="flex-start"
          flex={1}
          flexDirection="column"
        >
          <Grid item>
            <StatsPanel
              error={outboundCountError as ApiException}
              isError={isOutboundCountError}
              isLoading={isOutboundCountLoading}
              title={t('heading.shipments')}
              stats={[
                {
                  label: t('label.have-not-shipped'),
                  value: formatNumber.round(outboundCount?.notShipped),
                },
              ]}
            />
          </Grid>
          <Grid item>
            <StatsPanel
              error={requisitionCountError as ApiException}
              isError={isRequisitionCountError}
              isLoading={isRequisitionCountLoading}
              title={t('customer-requisition', { ns: 'app' })}
              stats={[
                {
                  label: t('label.new'),
                  value: formatNumber.round(requisitionCount?.response?.new),
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
              label={t('button.new-outbound-shipment')}
              onClick={modalControl.toggleOn}
            />
          </Grid>
        </Grid>
      </Widget>
    </>
  );
};
