import React, {
  createContext,
  useMemo,
  FC,
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
} from 'react';
import { PropsWithChildrenOnly } from '@common/types';
import { BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

import { Capacitor } from '@capacitor/core';
import { GlobalStyles } from '@mui/material';
import { useNotification } from '../hooks/useNotification';
import { useTranslation } from '@common/intl';
import { BarcodeScanner, ScannerType } from '@openmsupply-client/common';
import { useMockScanner } from './MockBarcodeScanner';
import { HoneywellScanner } from '@common/hooks';
import { parseResult, ScanResult } from './barcode/parseResult';
import {
  AvailableScannerType,
  ScannerDriver,
  createMockScannerDriver,
  createCameraScannerDriver,
  createElectronUSBScannerDriver,
  createHoneywellScannerDriver,
} from './barcode/scanners';

// Re-export for backward compatibility
export { parseResult, AvailableScannerType };
export type { ScanResult };

const MOCK_SCANNER_STORAGE_KEY = 'barcode_scanner_mock_enabled';

export type ScanCallback = (result: ScanResult, err?: unknown) => void;

interface BarcodeScannerControl {
  isEnabled: boolean;
  isConnected: boolean;
  isListening: boolean;
  scan: (formats?: BarcodeFormat[]) => Promise<ScanResult>;
  startListening: () => Promise<void>;
  stopScan: () => Promise<void>;
  setScanner: (scanner: BarcodeScanner) => void;
  setScannerType: (scanner: ScannerType) => void;
  scannerType: ScannerType;
  availableScanners: AvailableScannerType[];
  mockScannerEnabled: boolean;
  setMockScannerEnabled: (enabled: boolean) => void;
  supportsContinuousScanning: boolean;
  registerCallback: (callback: ScanCallback) => void;
  handleScanResult: (barcode: ScanResult) => void;
}

const BarcodeScannerContext = createContext<BarcodeScannerControl>(
  {} as BarcodeScannerControl
);

const { Provider } = BarcodeScannerContext;

export const BarcodeScannerProvider: FC<PropsWithChildrenOnly> = ({
  children,
}) => {
  const t = useTranslation();
  // When we use the camera barcode scanner, we need to hide the app in the background
  const [hideApp, setHideApp] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasHoneywellScanner, setHasHoneywellScanner] =
    useState<boolean>(false);
  const { error } = useNotification();
  const callbackRef = useRef<ScanCallback | null>(null);
  const { electronNativeAPI } = window;
  const [scanner, setScanner] = useState<BarcodeScanner | null>(null);
  const [localScannerType, setLocalScannerType] =
    useState<ScannerType>('usb_serial');
  const [mockScannerEnabled, setMockScannerEnabledState] = useState<boolean>(
    () => {
      const stored = localStorage.getItem(MOCK_SCANNER_STORAGE_KEY);
      return stored ? JSON.parse(stored) : false;
    }
  );

  const setMockScannerEnabled = (enabled: boolean) => {
    setMockScannerEnabledState(enabled);
    localStorage.setItem(MOCK_SCANNER_STORAGE_KEY, JSON.stringify(enabled));
  };

  const MockScanner = useMockScanner(mockScannerEnabled);

  const hasCameraBarcodeScanner =
    Capacitor.isPluginAvailable('BarcodeScanner') &&
    Capacitor.isNativePlatform();
  const hasElectronApi = !!electronNativeAPI;

  const hasHoneywellScannerPlugin =
    Capacitor.isPluginAvailable('HoneywellScanner') &&
    Capacitor.isNativePlatform();

  useEffect(() => {
    if (hasHoneywellScannerPlugin) {
      HoneywellScanner.available()
        .then(({ available }) => {
          setHasHoneywellScanner(available);
        })
        .catch(err => {
          console.error('Error checking Honeywell availability:', err);
          setHasHoneywellScanner(false);
        });
    }
  }, [hasHoneywellScannerPlugin]);

  // Build scanner drivers for each available scanner type
  const drivers: ScannerDriver[] = useMemo(() => {
    const result: ScannerDriver[] = [];

    if (mockScannerEnabled) {
      result.push(createMockScannerDriver(mockScannerEnabled, MockScanner));
    }
    if (hasCameraBarcodeScanner && !hasHoneywellScanner) {
      // Camera scanner is not available on Honeywell devices
      result.push(
        createCameraScannerDriver(
          setHideApp,
          t('error.unable-to-scan-barcode', { error: 'Not installed' })
        )
      );
    }
    if (hasElectronApi) {
      result.push(
        createElectronUSBScannerDriver(
          electronNativeAPI,
          !!scanner?.connected
        )
      );
    }
    if (hasHoneywellScanner) {
      result.push(
        createHoneywellScannerDriver(HoneywellScanner, msg => {
          console.error('Honeywell scanning error:', msg);
          error(t('error.unable-to-read-barcode'))();
        })
      );
    }

    return result;
  }, [
    mockScannerEnabled,
    MockScanner,
    hasCameraBarcodeScanner,
    hasHoneywellScanner,
    hasElectronApi,
    electronNativeAPI,
    scanner?.connected,
    t,
    error,
  ]);

  const availableScanners = useMemo(
    () => drivers.map(d => d.type),
    [drivers]
  );
  const isEnabled = drivers.length > 0;

  const scanBarcode = useCallback(
    async (formats?: BarcodeFormat[]) => {
      // Use the first available driver for one-off scanning
      for (const driver of drivers) {
        return driver.scan(formats);
      }
      return '';
    },
    [drivers]
  );

  const stopScan = useCallback(async () => {
    setHideApp(false);
    setIsListening(false);
    await Promise.all(drivers.map(d => d.stop()));
  }, [drivers]);

  const scan = useCallback(
    async (formats?: BarcodeFormat[]) => {
      let result: ScanResult = {};

      try {
        const barcode = await scanBarcode(formats);
        result = parseResult(barcode);
      } catch (e) {
        const msg = (e as Error)?.message || '';
        if (!msg.includes('canceled')) {
          error(t('error.unable-to-read-barcode'))();
          console.error(e);
        }
      } finally {
        await stopScan();
        setHideApp(false);
      }

      return result;
    },
    [scanBarcode, error, t, stopScan]
  );

  const startListening = useCallback(async () => {
    /* Starts listening for barcode scans and calls the provided callback
       with the scan result each time a barcode is scanned.
       For the camera scanner, this will NOT start scanning barcodes automatically, you'll need to call the scan() method separately.
       All available scanner types will be started if possible.
    */

    const onBarcode = (barcode: string) => {
      const result = parseResult(barcode);
      if (callbackRef.current) {
        callbackRef.current(result);
      } else {
        console.error(
          'No scan callback registered to handle barcode:',
          barcode
        );
      }
    };

    for (const driver of drivers) {
      if (driver.supportsContinuousScanning) {
        try {
          setIsListening(true);
          await driver.startListening(onBarcode);
        } catch (e) {
          setIsListening(false);
          console.error(`Error starting ${driver.type} listening:`, e);
          error(t('error.unable-to-read-barcode'))();
        }
      }
    }
  }, [drivers, error, t]);

  const setScannerType = useCallback(
    (type: ScannerType) => {
      setLocalScannerType(type);

      if (!electronNativeAPI) return;

      electronNativeAPI.setScannerType(type);
      electronNativeAPI.linkedBarcodeScannerDevice().then(setScanner);
    },
    [electronNativeAPI]
  );
  // calling this outside of a useEffect so that it will detect when a new scanner is added
  useEffect(() => {
    electronNativeAPI?.linkedBarcodeScannerDevice().then(setScanner);
    electronNativeAPI?.getScannerType().then(setLocalScannerType);
  }, [electronNativeAPI]);

  const val = useMemo(
    () => ({
      isEnabled,
      isConnected: drivers.some(d => d.isConnected),
      isListening,
      setScanner,
      scan,
      startListening,
      setScannerType,
      stopScan,
      scannerType: localScannerType,
      availableScanners,
      mockScannerEnabled,
      setMockScannerEnabled,
      supportsContinuousScanning: drivers.some(
        d => d.supportsContinuousScanning
      ),
      registerCallback: (callback: ScanCallback) =>
        (callbackRef.current = callback),
      handleScanResult: (barcode: ScanResult) => {
        if (callbackRef.current) {
          callbackRef.current(barcode);
        } else {
          console.error(
            'No scan callback registered to handle barcode:',
            barcode
          );
        }
      },
    }),
    [
      isEnabled,
      scan,
      stopScan,
      startListening,
      setScannerType,
      availableScanners,
      mockScannerEnabled,
      localScannerType,
      isListening,
      drivers,
    ]
  );

  return (
    <Provider value={val}>
      <>
        {MockScanner.scannerInput}
        <GlobalStyles
          styles={
            hideApp
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

export const useBarcodeScannerContext = (
  callback?: ScanCallback
): BarcodeScannerControl => {
  const barcodeScannerControl = useContext(BarcodeScannerContext);

  useEffect(() => {
    if (callback) {
      barcodeScannerControl.registerCallback(callback);
    }
  }, [barcodeScannerControl, callback]);

  return barcodeScannerControl;
};
