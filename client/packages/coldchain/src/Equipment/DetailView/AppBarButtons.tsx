import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  PrinterIcon,
  useNotification,
  LoadingButton,
  useDisabledNotificationPopover,
} from '@openmsupply-client/common';

import { useAssets } from '../api';
import { UpdateStatusButton } from './UpdateStatusButton';
import { Environment } from '@openmsupply-client/config';

export const AppBarButtonsComponent = () => {
  const { data } = useAssets.document.get();
  const t = useTranslation('coldchain');
  const { error, success } = useNotification();
  const { data: settings } = useAssets.utils.labelPrinterSettings();
  const [isPrinting, setIsPrinting] = React.useState(false);
  const { show, DisabledNotification } = useDisabledNotificationPopover({
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
    setIsPrinting(true);
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
      .then(async response => {
        if (response.status !== 200) {
          const text = await response.text();
          throw new Error(text);
        }
        success(t('messages.success-printing-qr'))();
      })
      .catch(e => {
        error(`${t('error.printing-qr')}: ${e.message}`)();
      })
      .finally(() => setIsPrinting(false));
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <UpdateStatusButton assetId={data?.id} />
        <LoadingButton
          startIcon={<PrinterIcon />}
          isLoading={isPrinting}
          onClick={onClick}
        >
          {t('button.print-qr')}
        </LoadingButton>
      </Grid>
      <DisabledNotification />
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
