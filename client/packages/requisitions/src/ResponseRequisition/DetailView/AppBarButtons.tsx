import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useDetailPanel,
  ButtonWithIcon,
  PlusCircleIcon,
  useTranslation,
  useConfirmationModal,
  useAlertModal,
} from '@openmsupply-client/common';
import { useCreateOutboundFromResponse, useResponseFields } from '../api';

export const AppBarButtonsComponent = () => {
  const { OpenButton } = useDetailPanel();
  const { linesRemainingToSupply } = useResponseFields(
    'linesRemainingToSupply'
  );
  const t = useTranslation('distribution');
  const { mutate: createOutbound } = useCreateOutboundFromResponse();
  const getConfirmation = useConfirmationModal({
    onConfirm: createOutbound,
    message: t('messages.create-outbound-from-requisition'),
    title: t('heading.create-outbound-shipment'),
  });
  const alert = useAlertModal({
    title: t('heading.cannot-do-that'),
    message: t('message.all-lines-have-been-fulfilled'),
  });

  const onCreateShipment = () => {
    if (linesRemainingToSupply.totalCount > 0) {
      alert();
    } else {
      getConfirmation();
    }
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.create-shipment')}
          onClick={onCreateShipment}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
