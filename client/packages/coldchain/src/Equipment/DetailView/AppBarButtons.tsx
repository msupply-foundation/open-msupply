import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  PrinterIcon,
  useNotification,
  LoadingButton,
  useDisabledNotificationPopover,
  useNativeClient,
  Typography,
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
    callback: (device: { printer: ZebraPrinterDevice[] }) => void
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
  const [deviceListResult, setDeviceListResult] = React.useState<string | null>(
    null
  );

  const { show, DisabledNotification } = useDisabledNotificationPopover({
    title: t('heading.unable-to-print'),
    message: t('error.label-printer-not-configured'),
  });
  const { printZpl } = useNativeClient();
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

      if (printZpl) {
        const response = await printZpl(result.zpl);
        setDeviceListResult(JSON.stringify(response, null, 2));
      }

      // TODO: Add support for browser down here:

      // if (window.BrowserPrint && result.zpl) {
      //   window.BrowserPrint.getLocalDevices(function (device) {
      //     console.log(device);
      //   });
      // } else {
      //   error(t('error.label-printer-not-configured'))();
      // }
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
      {deviceListResult && (
        <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
          {deviceListResult}
        </Typography>
      )}
      <DisabledNotification />
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
