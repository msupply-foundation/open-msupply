import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useDetailPanel,
  ButtonWithIcon,
  PlusCircleIcon,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useCreateOutboundFromResponse } from '../api';

export const AppBarButtonsComponent: FC = () => {
  const { OpenButton } = useDetailPanel();
  const t = useTranslation('distribution');
  const { mutate: createOutbound } = useCreateOutboundFromResponse();
  const confirmOutboundCreation = useConfirmationModal({
    onConfirm: createOutbound,
    message: t('messages.create-outbound-from-requisition'),
    title: t('heading.create-outbound-shipment'),
  });

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.create-shipment')}
          onClick={confirmOutboundCreation}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
