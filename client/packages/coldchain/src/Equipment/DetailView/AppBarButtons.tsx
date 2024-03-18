import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  PrinterIcon,
  ButtonWithIcon,
  useNotification,
  useDisabledNotification,
} from '@openmsupply-client/common';

import { useAssets } from '../api';
import { UpdateStatusButton } from './UpdateStatusButton';
import { Environment } from '@openmsupply-client/config';

export const AppBarButtonsComponent = () => {
  const { data } = useAssets.document.get();
  const t = useTranslation('coldchain');
  const { error, success } = useNotification();
  const { data: settings } = useAssets.utils.labelPrinterSettings();
  const { show, DisabledNotification } = useDisabledNotification({
    title: t('heading.unable-to-print'),
    message: t('error.label-printer-not-configured'),
  });
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (settings === null) {
      show(e);
    } else {
      printQR();
    }
  };

  const printQR = () => {
    fetch(Environment.PRINT_LABEL_QR, {
      method: 'POST',
      body: JSON.stringify({
        code: data?.id,
        message: `${t('label.serial')}: ${data?.serialNumber ?? ''}\n${t(
          'label.asset-number'
        )}: ${data?.assetNumber ?? ''}`,
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
          onClick={onClick}
        />
      </Grid>
      <DisabledNotification />
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
