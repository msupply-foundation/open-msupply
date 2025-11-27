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

declare global {
  interface Window {
    BrowserPrint?: any;
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
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (settings === null) {
      show(e);
    } else {
      printAssetLabel();
    }
  };

  const printAssetLabel = () => {
    const date = new Date().toLocaleDateString();
    setIsPrinting(true);
    const uridata = encodeURIComponent(
      JSON.stringify({
        code: data?.id,
        assetNumber: `${data?.assetNumber ?? ''}`,
        datePrinted: `${date}`,
      })
    );
    const url = `${Environment.PRINT_LABEL_QR}?data=${uridata}`;
    fetch(url, {
      method: 'GET',
      credentials: 'include',
    })
      .then(async response => {
        if (response.status !== 200) {
          const text = await response.text();
          throw new Error(text);
        }
        return response.json();
      })
      .then(json => {
        // the zebra printer does not return a valid response
        // so the fetch fails even when the print is successful
        fetch(json.url, { body: json.zpl, method: 'POST' }).catch(() => {});
        success(t('messages.success-printing-label'))();
      })
      .catch(e => {
        error(`${t('error.printing-label')}: ${e.message}`)();
      })
      .finally(() => setIsPrinting(false));
  };

  const printAssetLabelLocally = async () => {
    const date = new Date().toLocaleDateString();
    setIsPrinting(true);
    try {
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
        window.BrowserPrint.getLocalDevices(function (device) {
          const usbConnectedPrinter = device.printer.find(
            d => d.connection === 'usb' && d.deviceType === 'printer'
          );
          if (usbConnectedPrinter) {
            usbConnectedPrinter?.send(
              result.zpl,
              function (success) {
                console.log('success', success);
              },
              function (error) {
                console.error(error);
              }
            );
          }
        });
      } else {
        error(t('error.label-printer-not-configured'))();
      }
    } catch (e: any) {
      error(`${t('error.printing-label')}: ${e.message}`)();
    } finally {
      setIsPrinting(false);
    }
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
        <LoadingButton
          startIcon={<PrinterIcon />}
          isLoading={isPrinting}
          onClick={printAssetLabelLocally}
          label={t('button.print-asset-label-locally')}
          variant="outlined"
        />
      </Grid>
      <DisabledNotification />
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
