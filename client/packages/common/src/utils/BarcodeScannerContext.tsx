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
  startScan: () => Promise<ScanResult>;
  stopScan: () => void;
}

const BarcodeScannerContext = createContext<BarcodeScannerControl>({
  hasBarcodeScanner: false,
  startScan: async () => ({ hasContent: false }),
  stopScan: () => {},
});

const { Provider } = BarcodeScannerContext;

export const BarcodeScannerProvider: FC<PropsWithChildrenOnly> = ({
  children,
}) => {
  const t = useTranslation('common');
  const [isScanning, setIsScanning] = React.useState(false);
  const { error } = useNotification();
  const hasBarcodeScanner = Capacitor.isPluginAvailable('BarcodeScanner');

  const startScan = async () => {
    // Check camera permission
    await BarcodeScanner.checkPermission({ force: true });

    // make background of WebView transparent
    setIsScanning(true);
    BarcodeScanner.hideBackground();

    const timeout = setTimeout(() => {
      stopScan();
      error(t('error.unable-to-read-barcode'))();
    }, SCAN_TIMEOUT_IN_MS);
    const result = await BarcodeScanner.startScan(); // start scanning and wait for a result

    clearTimeout(timeout);
    setIsScanning(false);
    BarcodeScanner.showBackground();
    return result;
  };

  const stopScan = () => {
    BarcodeScanner.stopScan({ resolveScan: true });
    setIsScanning(false);
    BarcodeScanner.showBackground();
  };

  const val = useMemo(
    () => ({
      hasBarcodeScanner,
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
            isScanning
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
