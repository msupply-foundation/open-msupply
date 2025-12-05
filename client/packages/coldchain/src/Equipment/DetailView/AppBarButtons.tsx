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

interface ZebraPrinterDevice {
  connection: string;
  deviceType: string;
  send: (
    zpl: string,
    successCallback: (response: unknown) => void,
    errorCallback: (error: unknown) => void
  ) => void;
}

interface BrowserPrintGlobal {
  getLocalDevices: (
    callback: (device: { printer: ZebraPrinterDevice[] }) => void,
    errorCallback: (error: string) => void
  ) => void;
}

declare global {
  interface Window {
    BrowserPrint?: BrowserPrintGlobal;
  }
}

export const AppBarButtonsComponent = () => {
  const { data } = useAssets.document.get();
  const t = useTranslation();
  const { error, success } = useNotification();
  const { data: settings } = useAssets.utils.labelPrinterSettings();
  const [isPrinting, setIsPrinting] = React.useState(false);
  const { show, DisabledNotification } = useDisabledNotificationPopover({
    title: t('heading.unable-to-print'),
    message: t('error.label-printer-not-configured'),
  });

  const printAssetLabel = () => {
    const date = new Date().toLocaleDateString();
    setIsPrinting(true);
    fetch(Environment.PRINT_LABEL_QR, {
      method: 'POST',
      body: JSON.stringify({
        code: data?.id,
        assetNumber: `${data?.assetNumber ?? ''}`,
        datePrinted: `${date}`,
      }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async response => {
        if (response.status !== 200) {
          const text = await response.text();
          throw new Error(text);
        }
        success(t('messages.success-printing-label'))();
      })
      .catch(e => {
        error(`${t('error.printing-label')}: ${e.message}`)();
      })
      .finally(() => setIsPrinting(false));
  };

  const printAssetLabelViaUsb = async () => {
    const date = new Date().toLocaleDateString();
    setIsPrinting(true);
    try {
      if (!window.BrowserPrint) {
        console.warn('No BrowserPrint');
        error(t('error.printing-label'))();
        return;
      }

      const uridata = encodeURIComponent(
        JSON.stringify({
          code: data?.id,
          assetNumber: `${data?.assetNumber ?? ''}`,
          datePrinted: `${date}`,
        })
      );
      const url = `${Environment.PRINT_LABEL_QR}?data=${uridata}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.status !== 200) {
        const text = await response.text();
        throw new Error(text);
      }

      const result = await response.json();

      if (window.BrowserPrint && result.zpl) {
        window.BrowserPrint.getLocalDevices(
          device => {
            const usbConnectedPrinter = device.printer?.find(
              d => d.connection === 'usb' && d.deviceType === 'printer'
            );

            if (usbConnectedPrinter) {
              usbConnectedPrinter.send(
                result.zpl,
                () => success(t('messages.success-printing-label'))(),
                e => error(`${t('error.printing-label')} ${e}`)()
              );
            } else {
              error(t('error.no-usb-printer-found'))();
            }
          },
          e => error(`${t('error.printing-label')} ${e}`)()
        );
      }
    } catch (e: any) {
      error(`${t('error.printing-label')} ${e.message})}`)();
    } finally {
      setIsPrinting(false);
    }
  };

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (settings === null) show(e);
    if (!settings?.isUsb) printAssetLabel();
    if (settings?.isUsb) printAssetLabelViaUsb();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <UpdateStatusButton assetId={data?.id} />
        <LoadingButton
          startIcon={<PrinterIcon />}
          isLoading={isPrinting}
          onClick={onClick}
          label={t('button.print-asset-label')}
          variant="outlined"
        />
      </Grid>
      <DisabledNotification />
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
