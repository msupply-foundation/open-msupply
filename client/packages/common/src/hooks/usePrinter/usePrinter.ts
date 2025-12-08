import { MouseEvent, useState } from 'react';
import { useTranslation } from '@common/intl';
import { LabelPrinterSettingNode } from '@common/types';
import { useDisabledNotificationPopover } from '@common/components';
import { useNotification } from '../useNotification';
import { useLocalStorage } from '../../localStorage';

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

interface PrintOptions {
  endpoint: string;
  payload: unknown;
  method?: 'POST' | 'GET';
}

export const usePrinter = (
  printerSettings?: LabelPrinterSettingNode | null
) => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isUsb] = useLocalStorage('/printlabel/isusb', false);

  const { show, DisabledNotification } = useDisabledNotificationPopover({
    title: t('heading.unable-to-print'),
    message: t('error.label-printer-not-configured'),
  });

  const printViaNetwork = async ({
    endpoint,
    payload,
    method = 'POST',
  }: PrintOptions) => {
    setIsPrinting(true);
    try {
      const response = await fetch(endpoint, {
        method,
        body: JSON.stringify(payload),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status !== 200) {
        const text = await response.text();
        throw new Error(text);
      }

      success(t('messages.success-printing-label'));
    } catch (e: any) {
      error(`${t('error.printing-label')}: ${e.message}`)();
    } finally {
      setIsPrinting(false);
    }
  };

  const printViaUsb = async ({ endpoint, payload }: PrintOptions) => {
    setIsPrinting(true);
    try {
      if (!window.BrowserPrint) {
        console.warn('No BrowserPrint');
        error(t('error.printing-label'))();
        return;
      }

      const uridata = encodeURIComponent(JSON.stringify(payload));
      const url = `${endpoint}?data=${uridata}`;

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
      error(`${t('error.printing-label')} ${e.message}`)();
    } finally {
      setIsPrinting(false);
    }
  };

  const print = async (
    options: PrintOptions,
    e?: MouseEvent<HTMLButtonElement>
  ) => {
    if (isUsb) {
      await printViaUsb(options);
      return;
    }

    if (printerSettings === null) {
      if (e) show(e);
      return;
    }

    await printViaNetwork(options);
  };

  return {
    isPrinting,
    print,
    DisabledNotification,
    isUsbPrinting: isUsb,
  };
};
