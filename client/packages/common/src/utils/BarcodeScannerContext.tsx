/* eslint-disable no-console */
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
import { Formatter } from './formatters';
import { BarcodeScanner, ScannerType } from '@openmsupply-client/common';
import { Gs1Barcode, BarcodeUtils } from './barcode';
import { useMockScanner } from './MockBarcodeScanner';
import { HoneywellScanner } from '@common/hooks';

const SCAN_TIMEOUT_IN_MS = 50000;
const INSTALL_TIMEOUT_IN_MS = 60000;
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
  scannerInstallState: ScannerInstallState;
  installProgress: number;
}

export enum ScannerInstallState {
  Unknown = 'unknown',
  Checking = 'checking',
  Installing = 'installing',
  Installed = 'installed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

const BarcodeScannerContext = createContext<BarcodeScannerControl>(
  {} as BarcodeScannerControl
);

const { Provider } = BarcodeScannerContext;

export const parseResult = (content?: string): ScanResult => {
  if (!content) return {};

  try {
    const gs1 = BarcodeUtils.parseGS1Barcode(content);

    // If no items were parsed, treat as raw barcode
    if (!gs1.parsedCodeItems || gs1.parsedCodeItems.length === 0) {
      return { content };
    }

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
  const [hideApp, setHideApp] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasHoneywellScanner, setHasHoneywellScanner] =
    useState<boolean>(false);
  const [scannerInstallState, setScannerInstallState] =
    useState<ScannerInstallState>(ScannerInstallState.Unknown);
  const [installProgress, setInstallProgress] = useState<number>(0);
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
      scanners.push(AvailableScannerType.Camera);
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

  const googleBarcodeScannerAvailable = useCallback(
    () =>
      new Promise<boolean>(async (resolve, reject) => {
        try {
          setScannerInstallState(ScannerInstallState.Checking);

          const handleScannerInstall = (
            event: GoogleBarcodeScannerModuleInstallProgressEvent
          ) => {
            // Update progress directly from the event if available
            if (!!event.progress) {
              setInstallProgress(event.progress);
            }

            switch (event.state) {
              case GoogleBarcodeScannerModuleInstallState.COMPLETED:
                setScannerInstallState(ScannerInstallState.Installed);
                setInstallProgress(100);
                BarcodeScannerPlugin.removeAllListeners();
                resolve(true);
                break;
              case GoogleBarcodeScannerModuleInstallState.FAILED:
                setScannerInstallState(ScannerInstallState.Failed);
                setInstallProgress(0);
                BarcodeScannerPlugin.removeAllListeners();
                resolve(false);
                break;
              case GoogleBarcodeScannerModuleInstallState.CANCELED:
                setScannerInstallState(ScannerInstallState.Cancelled);
                setInstallProgress(0);
                BarcodeScannerPlugin.removeAllListeners();
                resolve(false);
                break;
              case GoogleBarcodeScannerModuleInstallState.PENDING:
              case GoogleBarcodeScannerModuleInstallState.DOWNLOADING:
              case GoogleBarcodeScannerModuleInstallState.INSTALLING:
              case GoogleBarcodeScannerModuleInstallState.DOWNLOAD_PAUSED:
                setScannerInstallState(ScannerInstallState.Installing);
                break;
              default:
                break;
            }
          };

          const { available } =
            await BarcodeScannerPlugin.isGoogleBarcodeScannerModuleAvailable();

          if (available) {
            setScannerInstallState(ScannerInstallState.Installed);
            setInstallProgress(100);
            resolve(true);
            return;
          }

          setScannerInstallState(ScannerInstallState.Installing);

          await BarcodeScannerPlugin.addListener(
            'googleBarcodeScannerModuleInstallProgress',
            handleScannerInstall
          );

          await BarcodeScannerPlugin.installGoogleBarcodeScannerModule();
        } catch (e) {
          console.error(
            'Error checking/installing Google Barcode Scanner module:',
            e
          );
          setScannerInstallState(ScannerInstallState.Failed);
          setInstallProgress(0);
          reject(e);
        }
      }),
    []
  );

  const scanBarcode = useCallback(
    async (formats?: BarcodeFormat[]) => {
      switch (true) {
        case mockScannerEnabled:
          return await MockScanner.scan();

        case hasElectronApi:
          const timeoutPromise = new Promise<undefined>((_, reject) =>
            setTimeout(reject, SCAN_TIMEOUT_IN_MS, 'Scan timed out')
          );
          const { startBarcodeScan } = electronNativeAPI;
          await startBarcodeScan();

          const barcodePromise = new Promise<string | undefined>(
            async resolve => {
              electronNativeAPI.onBarcodeScan((_event, data) =>
                resolve(BarcodeUtils.parseBarcodeFromBytes(data))
              );
            }
          );
          return await Promise.race([timeoutPromise, barcodePromise]);

        case hasCameraBarcodeScanner:
          try {
            const installTimeoutPromise = new Promise<boolean>((_, reject) =>
              setTimeout(() => {
                setScannerInstallState(ScannerInstallState.Failed);
                reject(new Error('Installation timeout'));
              }, INSTALL_TIMEOUT_IN_MS)
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

            setHideApp(true);
            const { barcodes } = await BarcodeScannerPlugin.scan({
              autoZoom: true,
              formats,
            });
            setHideApp(false);

            if (barcodes && barcodes.length > 0 && barcodes[0]) {
              return barcodes[0].rawValue;
            }

            return '';
          } catch (e) {
            setHideApp(false);
            throw e;
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
      googleBarcodeScannerAvailable,
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

        // Reset install state on successful scan
        if (scannerInstallState === ScannerInstallState.Failed) {
          setScannerInstallState(ScannerInstallState.Installed);
        }
      } catch (e) {
        const msg = (e as Error)?.message || '';
        console.error('Scan error:', msg, e);

        // Don't show error for user cancellation
        if (!msg.toLowerCase().includes('cancel')) {
          if (
            msg.includes('Installation timeout') ||
            msg.includes('Install timed out')
          ) {
            error(t('error.scanner-installation-timeout'))();
          } else if (msg.includes('installation failed')) {
            error(t('error.scanner-installation-failed'))();
          } else if (msg.includes('not installed')) {
            error(t('error.scanner-not-installed'))();
          } else {
            error(t('error.unable-to-read-barcode'))();
          }
        }
      } finally {
        await stopScan();
        setHideApp(false);
        setInstallProgress(0);
      }

      return result;
    },
    [scanBarcode, error, t, stopScan, scannerInstallState]
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
            } else {
              console.error(
                'No scan callback registered to handle barcode:',
                data.barcode
              );
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
          const barcode = BarcodeUtils.parseBarcodeFromBytes(data);
          if (callbackRef.current) {
            callbackRef.current(parseResult(barcode));
          } else {
            console.error(
              'No scan callback registered to handle barcode:',
              barcode
            );
          }
        });
      } catch (e) {
        setIsListening(false);
        console.error('Error starting Electron scanner listening:', e);
        throw e;
      }
    }

    if (mockScannerEnabled) {
      setIsListening(true);
      const scanHandler = async (barcode: string) => {
        const result = parseResult(barcode);
        if (callbackRef.current) {
          callbackRef.current(result);
        } else {
          console.error(
            'No scan callback registered to handle barcode:',
            result
          );
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
        if (callbackRef.current) {
          callbackRef.current(barcode);
        } else {
          console.error(
            'No scan callback registered to handle barcode:',
            barcode
          );
        }
      },
      scannerInstallState,
      installProgress,
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
      scannerInstallState,
      installProgress,
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
