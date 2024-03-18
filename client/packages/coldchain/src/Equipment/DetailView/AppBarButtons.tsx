import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  PrinterIcon,
  ButtonWithIcon,
  useNotification,
} from '@openmsupply-client/common';
import { useAssets } from '../api';
import { UpdateStatusButton } from './UpdateStatusButton';
import { Environment } from '@openmsupply-client/config';

export const AppBarButtonsComponent = () => {
  const { data } = useAssets.document.get();
  const t = useTranslation('coldchain');
  const { error, success } = useNotification();

  const printQR = () => {
    fetch(Environment.PRINT_LABEL_QR, {
      method: 'POST',
      body: JSON.stringify({
        code: data?.id,
        message: `${t('label.serial')}: ${data?.serialNumber ?? ''}\n${t(
          'label.code'
        )}: ${data?.code ?? ''}`,
      }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(response => {
        if (response.status === 200) {
          success(t('messages.success-printing-qr'))();
          return;
        }
        error(t('error.printing-qr'))();
      })
      .catch(() => {
        error(t('error.printing-qr'))();
      });
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <UpdateStatusButton assetId={data?.id} />
        <ButtonWithIcon
          Icon={<PrinterIcon />}
          label={t('button.print-qr')}
          onClick={printQR}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
