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
import {
  BarcodeFormat,
  BarcodeScanner as BarcodeScannerPlugin,
  GoogleBarcodeScannerModuleInstallProgressEvent,
  GoogleBarcodeScannerModuleInstallState,
} from '@capacitor-mlkit/barcode-scanning';

import { Capacitor } from '@capacitor/core';
import { GlobalStyles } from '@mui/material';
import { useNotification } from '../hooks/useNotification';
import { useTranslation } from '@common/intl';
import { Gs1Barcode, parseBarcode } from 'gs1-barcode-parser-mod';
import { Formatter } from './formatters';
import { BarcodeScanner, ScannerType } from '@openmsupply-client/common';
import { useMockScanner } from './MockBarcodeScanner';
import { HoneywellScanner } from '@common/hooks';

const SCAN_TIMEOUT_IN_MS = 50000;
const INSTALL_TIMEOUT_IN_MS = 30000;
const MOCK_SCANNER_STORAGE_KEY = 'barcode_scanner_mock_enabled';

export enum AvailableScannerType {
  Mock = 'mock',
  Camera = 'camera',
  ElectronUSB = 'electron_usb',
  Honeywell = 'honeywell',
}

export interface ScanResult {
  content?: string; // Raw barcode content
  gs1?: Gs1Barcode; // Full GS1 barcode object
  gs1string?: string;
  gtin?: string;
  batch?: string;
  expiryDate?: string | null;
  manufactureDate?: string | null;
  packSize?: number;
  quantity?: number;
}

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
    const expiryString = gs1?.parsedCodeItems?.find(item => item.ai === '17')
      ?.data as Date;
    const manufactureDateString = gs1?.parsedCodeItems?.find(
      (item: { ai: string }) => item.ai === '11'
    )?.data as Date;
    const quantity =
      Number(
        gs1?.parsedCodeItems?.find((item: { ai: string }) => item.ai === '30')
          ?.data
      ) || undefined;
    const packSize =
      Number(
        gs1?.parsedCodeItems?.find((item: { ai: string }) => item.ai === '37')
          ?.data
      ) || undefined;

    return {
      content,
      gs1,
      gs1string: gs1?.toString(),
      gtin,
      batch,
      expiryDate: expiryString ? Formatter.naiveDate(expiryString) : undefined,
      manufactureDate: manufactureDateString
        ? Formatter.naiveDate(manufactureDateString)
        : undefined,
      quantity,
      packSize,
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

  const availableScanners: AvailableScannerType[] = useMemo(() => {
    const scanners: AvailableScannerType[] = [];
    if (mockScannerEnabled) scanners.push(AvailableScannerType.Mock);
    if (hasCameraBarcodeScanner && !hasHoneywellScanner)
      scanners.push(AvailableScannerType.Camera); // Camera scanner is not available on Honeywell devices. Disabled camera scanner if honeywell is available.
    if (hasElectronApi) scanners.push(AvailableScannerType.ElectronUSB);
    if (hasHoneywellScanner) scanners.push(AvailableScannerType.Honeywell);
    return scanners;
  }, [
    mockScannerEnabled,
    hasCameraBarcodeScanner,
    hasElectronApi,
    hasHoneywellScanner,
  ]);

  const isEnabled = availableScanners.length > 0;

  const googleBarcodeScannerAvailable = () =>
    new Promise<boolean>(async resolve => {
      const handleScannerInstall = (
        event: GoogleBarcodeScannerModuleInstallProgressEvent
      ) => {
        switch (event.state) {
          case GoogleBarcodeScannerModuleInstallState.COMPLETED:
            BarcodeScannerPlugin.removeAllListeners();
            resolve(true);
            break;
          case GoogleBarcodeScannerModuleInstallState.FAILED:
          case GoogleBarcodeScannerModuleInstallState.CANCELED:
            BarcodeScannerPlugin.removeAllListeners();
            resolve(false);
            break;
          default:
            break;
        }
      };

      const { available } =
        await BarcodeScannerPlugin.isGoogleBarcodeScannerModuleAvailable();

      if (available) {
        resolve(true);
        return;
      }

      await BarcodeScannerPlugin.addListener(
        'googleBarcodeScannerModuleInstallProgress',
        handleScannerInstall
      );
      await BarcodeScannerPlugin.installGoogleBarcodeScannerModule();
    });

  const scanBarcode = useCallback(
    async (formats?: BarcodeFormat[]) => {
      switch (true) {
        case mockScannerEnabled:
          const mockBarcode = await MockScanner.scan();
          return mockBarcode;

        case hasElectronApi:
          const timeoutPromise = new Promise<undefined>((_, reject) =>
            setTimeout(reject, SCAN_TIMEOUT_IN_MS, 'Scan timed out')
          );
          const { startBarcodeScan } = electronNativeAPI;
          await startBarcodeScan();

          const barcodePromise = new Promise<string | undefined>(
            async resolve => {
              electronNativeAPI.onBarcodeScan((_event, data) =>
                resolve(parseBarcodeData(data))
              );
            }
          );
          const barcode = await Promise.race([timeoutPromise, barcodePromise]);
          return barcode;

        case hasCameraBarcodeScanner:
          const installTimeoutPromise = new Promise<undefined>((_, reject) =>
            setTimeout(reject, INSTALL_TIMEOUT_IN_MS, 'Install timed out')
          );
          const isInstalled = await Promise.race([
            installTimeoutPromise,
            googleBarcodeScannerAvailable(),
          ]);

          if (!isInstalled) {
            throw new Error(
              t('error.unable-to-scan-barcode', { error: 'Not installed' })
            );
          }

          // Hide the app to show camera view
          setHideApp(true);
          const { barcodes } = await BarcodeScannerPlugin.scan({
            autoZoom: true,
            formats,
          });
          setHideApp(false);

          if (barcodes && barcodes.length > 0 && barcodes[0]) {
            return barcodes[0].rawValue;
          }
      }

      return '';
    },
    [
      mockScannerEnabled,
      MockScanner,
      hasElectronApi,
      electronNativeAPI,
      hasCameraBarcodeScanner,
      t,
    ]
  );

  const stopScan = useCallback(async () => {
    setHideApp(false);
    setIsListening(false);
    if (mockScannerEnabled) {
      await MockScanner.stopListening();
    }

    if (hasElectronApi) {
      await electronNativeAPI.stopBarcodeScan();
    }

    if (hasCameraBarcodeScanner) {
      await BarcodeScannerPlugin.removeAllListeners();
      await BarcodeScannerPlugin.stopScan();
    }

    if (hasHoneywellScanner) {
      try {
        await HoneywellScanner.release();
      } catch (error) {
        console.error('Error releasing Honeywell scanner:', error);
      }
    }
  }, [
    mockScannerEnabled,
    MockScanner,
    hasElectronApi,
    electronNativeAPI,
    hasCameraBarcodeScanner,
    hasHoneywellScanner,
  ]);

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

    if (hasHoneywellScanner) {
      try {
        setIsListening(true);

        // Set up listener (automatically claims the scanner)
        await HoneywellScanner.listen({}, (data, err) => {
          if (err) {
            console.error('Honeywell scanning error:', err);
            // I think we can ignore errors here for now as they seem to happen regularly
            //              error(t('error.unable-to-read-barcode'))();
            return;
          }
          if (data && 'barcode' in data) {
            if (callbackRef.current) {
              callbackRef.current(parseResult(data.barcode));
            }
          } else if (data && 'error' in data) {
            console.error('Honeywell scanning error:', data.error);
            error(t('error.unable-to-read-barcode'))();
          }
        });
      } catch (e) {
        console.error('Error starting Honeywell listening:', e);
        setIsListening(false);
        error(t('error.unable-to-read-barcode'))();
      }
    }

    if (hasElectronApi) {
      setIsListening(true);
      try {
        const { startBarcodeScan } = electronNativeAPI;
        await startBarcodeScan();
        electronNativeAPI.onBarcodeScan((_event, data) => {
          const barcode = parseBarcodeData(data);
          if (callbackRef.current) {
            callbackRef.current(parseResult(barcode));
          }
        });
      } catch (e) {
        setIsListening(false);
        console.error('Error starting Electron scanner listening:', e);
        throw e;
      }
    }

    if (hasCameraBarcodeScanner) {
      // Don't start camera scanning on listening, wait for explicit scan() call
    }

    if (mockScannerEnabled) {
      setIsListening(true);
      const scanHandler = async (barcode: string) => {
        const result = parseResult(barcode);
        if (callbackRef.current) {
          callbackRef.current(result);
        }
      };
      await MockScanner.startListening(scanHandler);
    }
  }, [
    hasHoneywellScanner,
    error,
    t,
    hasElectronApi,
    electronNativeAPI,
    hasCameraBarcodeScanner,
    mockScannerEnabled,
    MockScanner,
  ]);

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
      // Capacitor.isNativePlatform returns true if running on android or ios
      // and we use the camera for scanning currently, no need to check for
      // a physical device to be connected
      isConnected:
        mockScannerEnabled ||
        !!scanner?.connected ||
        Capacitor.isNativePlatform(),
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
      supportsContinuousScanning:
        hasHoneywellScanner || hasElectronApi || mockScannerEnabled,
      registerCallback: (callback: ScanCallback) =>
        (callbackRef.current = callback),
      handleScanResult: (barcode: ScanResult) => {
        return callbackRef.current && callbackRef.current(barcode);
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
      scanner,
      isListening,
      hasHoneywellScanner,
      hasElectronApi,
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
      // console.log('Registering barcode scan callback');
      barcodeScannerControl.registerCallback(callback);
    }
  }, [callback]);

  return barcodeScannerControl;
};
