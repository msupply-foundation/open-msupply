import React, { createContext, useMemo, FC } from 'react';
import { PropsWithChildrenOnly } from '@common/types';
import {
  BarcodeScanner,
  ScanResult,
} from '@capacitor-community/barcode-scanner';
import { Capacitor } from '@capacitor/core';
import { GlobalStyles } from '@mui/material';
import { useNotification } from '../hooks/useNotification';
import { useTranslation } from '@common/intl';

const SCAN_TIMEOUT_IN_MS = 5000;

interface BarcodeScannerControl {
  hasBarcodeScanner: boolean;
  isScanning: boolean;
  startScan: () => Promise<ScanResult>;
  stopScan: () => void;
}

const BarcodeScannerContext = createContext<BarcodeScannerControl>({
  hasBarcodeScanner: false,
  isScanning: false,
  startScan: async () => ({ hasContent: false }),
  stopScan: () => {},
});

const { Provider } = BarcodeScannerContext;

const parseBarcode = (data: number[] | undefined) => {
  if (!data || data.length < 5) return undefined;

  return data
    .slice(4)
    .reduce((barcode, curr) => barcode + String.fromCharCode(curr), '');
};

export const BarcodeScannerProvider: FC<PropsWithChildrenOnly> = ({
  children,
}) => {
  const t = useTranslation('common');
  const [isScanning, setIsScanning] = React.useState(false);
  const { error } = useNotification();
  const { electronAPI } = window;

  const hasNativeBarcodeScanner =
    Capacitor.isPluginAvailable('BarcodeScanner') &&
    Capacitor.isNativePlatform();
  const hasElectronApi = !!electronAPI;
  const hasBarcodeScanner = hasNativeBarcodeScanner || hasElectronApi;

  const startScan = async () => {
    setIsScanning(true);
    const timeout = setTimeout(() => {
      stopScan();
      // if the timeout has been hit then an error is raised
      // by the electron implementation, and the snack is shown
      // in that error handler, no need to duplicate
      if (!hasElectronApi) error(t('error.unable-to-read-barcode'))();
    }, SCAN_TIMEOUT_IN_MS);

    if (hasElectronApi) {
      try {
        const { startBarcodeScan } = electronAPI;
        const data = await startBarcodeScan();
        const barcode = parseBarcode(data);
        clearTimeout(timeout);
        setIsScanning(false);
        return { hasContent: true, content: barcode };
      } catch {
        error(t('error.unable-to-read-barcode'))();
        clearTimeout(timeout);
      }
    }

    if (hasNativeBarcodeScanner) {
      // Check camera permission
      await BarcodeScanner.checkPermission({ force: true });

      // make background of WebView transparent
      BarcodeScanner.hideBackground();
      const result = await BarcodeScanner.startScan(); // start scanning and wait for a result
      clearTimeout(timeout);
      setIsScanning(false);
      BarcodeScanner.showBackground();
      return result;
    }

    return { hasContent: false };
  };

  const stopScan = () => {
    setIsScanning(false);
    if (hasElectronApi) {
      electronAPI.stopBarcodeScan();
    }

    if (hasNativeBarcodeScanner) {
      BarcodeScanner.stopScan({ resolveScan: true });
      BarcodeScanner.showBackground();
    }
  };

  const val = useMemo(
    () => ({
      hasBarcodeScanner,
      isScanning,
      startScan,
      stopScan,
    }),
    [hasBarcodeScanner, startScan, stopScan]
  );

  return (
    <Provider value={val}>
      <>
        <GlobalStyles
          styles={
            isScanning && hasNativeBarcodeScanner
              ? {
                  body: {
                    backgroundColor: 'transparent!important',
                    position: 'absolute',
                    right: '100vw',
                  },
                  '.MuiModal-root': { display: 'none' },
                }
              : {}
          }
        />
        {children}
      </>
    </Provider>
  );
};

export const useBarcodeScannerContext = (): BarcodeScannerControl => {
  const barcodeScannerControl = React.useContext(BarcodeScannerContext);
  return barcodeScannerControl;
};
