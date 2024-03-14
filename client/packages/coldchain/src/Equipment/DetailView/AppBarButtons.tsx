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

export const AppBarButtonsComponent = ({}) => {
  const { data } = useAssets.document.get();
  const t = useTranslation('coldchain');
  const { error, success } = useNotification();

  // TODO check for no code? raise error?
  const printQR = () => {
    fetch('http://localhost:8000/print/label-qr', {
      method: 'POST',
      body: JSON.stringify({
        code: data?.code,
        message: `${t('label.serial')}: ${data?.serialNumber ?? ''}\n${t(
          'label.code'
        )}: ${data?.code ?? ''}`,
      }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(() => {
        success(t('messages.success-printing-qr'))();
      })
      .catch(() => {
        error(t('error.printing-qr'))();
      });
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <UpdateStatusButton />
        <ButtonWithIcon
          Icon={<PrinterIcon />}
          label={t('button.print')}
          onClick={printQR}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
