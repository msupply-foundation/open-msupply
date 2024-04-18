import React, { createContext, useMemo, FC, useState, useEffect } from 'react';
import { PropsWithChildrenOnly } from '@common/types';
import { BarcodeScanner as BarcodeScannerPlugin } from '@capacitor-community/barcode-scanner';
import { Capacitor } from '@capacitor/core';
import { GlobalStyles } from '@mui/material';
import { useNotification } from '../hooks/useNotification';
import { useTranslation } from '@common/intl';
import { parseBarcode } from 'gs1-barcode-parser-mod';
import { Formatter } from './formatters';
import { BarcodeScanner, ScannerType } from '@openmsupply-client/common';

const SCAN_TIMEOUT_IN_MS = 5000;

export interface ScanResult {
  batch?: string;
  content?: string;
  expiryDate?: string | null;
  gtin?: string;
}

export type ScanCallback = (result: ScanResult) => void;

interface BarcodeScannerControl {
  isEnabled: boolean;
  isConnected: boolean;
  isScanning: boolean;
  startScan: () => Promise<ScanResult>;
  startScanning: (
    callback: (result: ScanResult, err?: any) => void
  ) => Promise<void>;
  stopScan: () => Promise<void>;
  setScanner: (scanner: BarcodeScanner) => void;
  setScannerType: (scanner: ScannerType) => void;
  scannerType: ScannerType;
}

const BarcodeScannerContext = createContext<BarcodeScannerControl>({} as any);

const { Provider } = BarcodeScannerContext;

const getIndex = (digit: number, data: number[]) => {
  const index = data.indexOf(digit);
  return index === -1 ? undefined : index;
};

export const parseBarcodeData = (data: number[] | undefined) => {
  if (!data || data.length < 5) return undefined;
  // the scanner is returning \x00 and \x22 characters when in continuous mode
  // these need to be stripped out to prevent issues when parsing the barcode
  const synchronousIdleIndex = getIndex(22, data);
  const trimmedData = data.slice(4, synchronousIdleIndex);
  const zeroIndex = getIndex(0, trimmedData);

  return trimmedData
    .slice(0, zeroIndex)
    .reduce((barcode, curr) => barcode + String.fromCharCode(curr), '');
};

export const parseResult = (content?: string): ScanResult => {
  if (!content) return {};

  try {
    const gs1 = parseBarcode(content);
    const gtin = gs1?.parsedCodeItems?.find(item => item.ai === '01')
      ?.data as string;
    const batch = gs1?.parsedCodeItems?.find(item => item.ai === '10')
      ?.data as string;
    const expiry = gs1?.parsedCodeItems?.find(item => item.ai === '17')
      ?.data as Date;

    return {
      batch,
      content,
      expiryDate: expiry ? Formatter.naiveDate(expiry) : undefined,
      gtin,
    };
  } catch (e) {
    console.error(`Error parsing barcode ${content}:`, e);
    return { content };
  }
};

export const BarcodeScannerProvider: FC<PropsWithChildrenOnly> = ({
  children,
}) => {
  const t = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const { error } = useNotification();
  const { electronNativeAPI } = window;
  const [scanner, setScanner] = useState<BarcodeScanner | null>(null);
  const [localScannerType, setLocalScannerType] =
    useState<ScannerType>('usb_serial');

  const hasNativeBarcodeScanner =
    Capacitor.isPluginAvailable('BarcodeScanner') &&
    Capacitor.isNativePlatform();
  const hasElectronApi = !!electronNativeAPI;
  const isEnabled = hasNativeBarcodeScanner || hasElectronApi;

  const startScan = async () => {
    setIsScanning(true);

    const timeoutPromise = new Promise<undefined>((_, reject) =>
      setTimeout(reject, SCAN_TIMEOUT_IN_MS, 'Scan timed out')
    );

    const getBarcodePromise = () =>
      new Promise<string | undefined>(async (resolve, reject) => {
        switch (true) {
          case hasElectronApi:
            const { startBarcodeScan } = electronNativeAPI;
            await startBarcodeScan();

            electronNativeAPI.onBarcodeScan((_event, data) =>
              resolve(parseBarcodeData(data))
            );
            break;
          case hasNativeBarcodeScanner:
            // Check camera permission
            await BarcodeScannerPlugin.checkPermission({ force: true });

            // make background of WebView transparent
            BarcodeScannerPlugin.hideBackground();

            // start scanning and wait for a result
            const result = await BarcodeScannerPlugin.startScan();
            BarcodeScannerPlugin.showBackground();
            // for data matrix codes, the result is split by a group by character
            // only the first group is parsed, and with a \x1d at the start this group is empty
            resolve(result.content?.replace('\x1d', ''));
            break;
          default:
            reject(new Error('Cannot find scan api'));
            break;
        }
      });

    let result: ScanResult = {};

    try {
      const barcode = await Promise.race([timeoutPromise, getBarcodePromise()]);
      result = parseResult(barcode);
    } catch (e) {
      error(t('error.unable-to-read-barcode'))();
      console.error(e);
    } finally {
      await stopScan();
      setIsScanning(false);
    }

    return result;
  };

  const startScanning = async (callback: ScanCallback) => {
    setIsScanning(true);

    if (hasElectronApi) {
      try {
        const { startBarcodeScan } = electronNativeAPI;
        await startBarcodeScan();
        electronNativeAPI.onBarcodeScan((_event, data) => {
          const barcode = parseBarcodeData(data);
          callback(parseResult(barcode));
        });
      } catch (e) {
        setIsScanning(false);
        throw e;
      }
    }

    if (hasNativeBarcodeScanner) {
      setIsScanning(true);
      const timeout = setTimeout(async () => {
        await stopScan();
        if (!hasElectronApi) error(t('error.unable-to-read-barcode'))();
      }, SCAN_TIMEOUT_IN_MS);

      // Check camera permission
      await BarcodeScannerPlugin.checkPermission({ force: true });

      // make background of WebView transparent
      BarcodeScannerPlugin.hideBackground();
      const result = await BarcodeScannerPlugin.startScan(); // start scanning and wait for a result
      clearTimeout(timeout);
      setIsScanning(false);
      BarcodeScannerPlugin.showBackground();
      callback(result);
    }
  };

  const stopScan = async () => {
    setIsScanning(false);
    if (hasElectronApi) {
      await electronNativeAPI.stopBarcodeScan();
    }

    if (hasNativeBarcodeScanner) {
      await BarcodeScannerPlugin.stopScan({ resolveScan: true });
      await BarcodeScannerPlugin.showBackground();
    }
  };

  const setScannerType = (type: ScannerType) => {
    electronNativeAPI.setScannerType(type);
    electronNativeAPI?.linkedBarcodeScannerDevice().then(setScanner);
    setLocalScannerType(type);
  };
  // calling this outside of a useEffect so that it will detect when a new scanner is added
  useEffect(() => {
    electronNativeAPI?.linkedBarcodeScannerDevice().then(setScanner);
    electronNativeAPI?.getScannerType().then(setLocalScannerType);
  }, []);

  const val = useMemo(
    () => ({
      isEnabled,
      // Capacitor.isNativePlatform returns true if running on android or ios
      // and we use the camera for scanning currently, no need to check for
      // a physical device to be connected
      isConnected: !!scanner?.connected || Capacitor.isNativePlatform(),
      isScanning,
      setScanner,
      startScan,
      startScanning,
      setScannerType,
      stopScan,
      scannerType: localScannerType,
    }),
    [isEnabled, startScan, stopScan, startScanning]
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
