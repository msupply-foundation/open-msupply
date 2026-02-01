import React, {
  createContext,
  useMemo,
  FC,
  useState,
  useEffect,
  useRef,
  useCallback,
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

export enum AvailableScannerType {
  Manual = 'manual',
  Honeywell = 'honeywell',
  Camera = 'camera',
  ElectronUSB = 'electron-usb',
}

// Extend window type to include honeywell plugin
declare global {
  interface Window {
    plugins?: {
      honeywell?: {
        claim?: (callback: () => void) => void;
        release?: () => void;
        listen?: (
          success: (data: string) => void,
          error: (err: string) => void
        ) => void;
        scan?: () => void;
      };
    };
  }
}

const SCAN_TIMEOUT_IN_MS = 50000;
const INSTALL_TIMEOUT_IN_MS = 30000;

export interface ScanResult {
  content?: string; // Raw barcode content
  gs1?: Gs1Barcode; // Full GS1 barcode object
  gs1string?: string;
  gtin?: string;
  batch?: string;
  expiryDate?: string | null;
  manufactureDate?: string | null;
  packsize?: string;
  quantity?: string;
}

export type ScanCallback = (result: ScanResult) => void;

interface BarcodeScannerControl {
  isEnabled: boolean;
  isConnected: boolean;
  isScanning: boolean;
  scan: (formats?: BarcodeFormat[]) => Promise<ScanResult>;
  startScanning: (
    callback: (result: ScanResult, err?: any) => void
  ) => Promise<void>;
  stopScan: () => Promise<void>;
  setScanner: (scanner: BarcodeScanner) => void;
  setScannerType: (scanner: ScannerType) => void;
  scannerType: ScannerType;
  availableScanners: AvailableScannerType[];
  activeScanner: AvailableScannerType;
  setActiveScanner: (scanner: AvailableScannerType) => void;
  triggerManualScan: (barcode: string) => void;
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
    const expiryString = gs1?.parsedCodeItems?.find(item => item.ai === '17')
      ?.data as Date;
    const manufactureDateString = gs1?.parsedCodeItems?.find(
      (item: { ai: string }) => item.ai === '11'
    )?.data as Date;
    const quantity = gs1?.parsedCodeItems?.find(
      (item: { ai: string }) => item.ai === '30'
    )?.data as string;
    const packsize = gs1?.parsedCodeItems?.find(
      (item: { ai: string }) => item.ai === '37'
    )?.data as string;

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
      packsize,
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

  // Store the Honeywell callback in a ref so it's always up-to-date for the scanner
  const honeywellCallbackRef = useRef<ScanCallback>(() => {});
  const manualScanCallbackRef = useRef<ScanCallback>(() => {});

  const hasNativeBarcodeScanner =
    Capacitor.isPluginAvailable('BarcodeScanner') &&
    Capacitor.isNativePlatform();
  const hasElectronApi = !!electronNativeAPI;
  const hasHoneywellScanner = typeof window.plugins?.honeywell !== 'undefined';

  // Determine available scanners
  const availableScanners = useMemo(() => {
    const scanners: AvailableScannerType[] = [AvailableScannerType.Manual];
    if (hasHoneywellScanner) scanners.push(AvailableScannerType.Honeywell);
    if (hasNativeBarcodeScanner) scanners.push(AvailableScannerType.Camera);
    if (hasElectronApi) scanners.push(AvailableScannerType.ElectronUSB);
    return scanners;
  }, [hasHoneywellScanner, hasNativeBarcodeScanner, hasElectronApi]);

  // Active scanner state (prefer hardware scanners over manual)
  const [activeScanner, setActiveScanner] = useState<AvailableScannerType>(
    () => {
      if (hasHoneywellScanner) return AvailableScannerType.Honeywell;
      if (hasNativeBarcodeScanner) return AvailableScannerType.Camera;
      if (hasElectronApi) return AvailableScannerType.ElectronUSB;
      return AvailableScannerType.Manual;
    }
  );

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

  const scanBarcode = async (formats?: BarcodeFormat[]) => {
    switch (activeScanner) {
      case AvailableScannerType.Manual:
        // Manual scanner doesn't use this function, returns empty
        return '';

      case AvailableScannerType.Honeywell:
        // For Honeywell, we use continuous scanning mode
        // This just returns empty as scanning is continuous
        return '';

      case AvailableScannerType.ElectronUSB:
        if (!electronNativeAPI) return '';
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

      case AvailableScannerType.Camera:
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

        const { barcodes } = await BarcodeScannerPlugin.scan({
          autoZoom: true,
          formats,
        });

        if (barcodes && barcodes.length > 0 && barcodes[0]) {
          return barcodes[0].rawValue;
        }
    }

    return '';
  };

  const scan = async (formats?: BarcodeFormat[]) => {
    setIsScanning(true);

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
      setIsScanning(false);
    }

    return result;
  };

  const startScanning = async (callback: ScanCallback) => {
    setIsScanning(true);

    if (activeScanner === AvailableScannerType.Manual) {
      // Store callback for manual scanning
      manualScanCallbackRef.current = callback;
      return;
    }

    if (activeScanner === AvailableScannerType.Honeywell) {
      try {
        const honeywell = window.plugins?.honeywell;
        if (!honeywell) {
          throw new Error('Honeywell plugin not available');
        }

        // Update the ref with the latest callback
        honeywellCallbackRef.current = callback;

        // Register a stable callback that uses the ref
        honeywell.listen!(
          (data: string) => {
            // Always call the latest callback via the ref
            honeywellCallbackRef.current(parseResult(data));
          },
          (err: string) => {
            console.error('Honeywell scanning error:', err);
            error(t('error.unable-to-read-barcode'))();
            setIsScanning(false);
          }
        );
      } catch (e) {
        setIsScanning(false);
        throw e;
      }
    }

    if (
      activeScanner === AvailableScannerType.ElectronUSB &&
      electronNativeAPI
    ) {
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

    if (activeScanner === AvailableScannerType.Camera) {
      setIsScanning(true);

      await BarcodeScannerPlugin.addListener(
        'barcodesScanned',
        async result => {
          callback(parseResult(result.barcodes[0]?.rawValue));
        }
      );

      await BarcodeScannerPlugin.startScan();
    }
  };

  const stopScan = async () => {
    setIsScanning(false);

    if (activeScanner === AvailableScannerType.Honeywell) {
      const honeywell = window.plugins?.honeywell;
      if (honeywell?.release) {
        honeywell.release();
      }
    }

    if (
      electronNativeAPI &&
      activeScanner === AvailableScannerType.ElectronUSB
    ) {
      await electronNativeAPI.stopBarcodeScan();
    }

    if (activeScanner === AvailableScannerType.Camera) {
      await BarcodeScannerPlugin.removeAllListeners();
      await BarcodeScannerPlugin.stopScan();
    }

    if (activeScanner === AvailableScannerType.Manual) {
      // Clear manual callback
      manualScanCallbackRef.current = () => {};
    }
  };

  const setScannerType = (type: ScannerType) => {
    setLocalScannerType(type);

    if (!electronNativeAPI) return;

    electronNativeAPI.setScannerType(type);
    electronNativeAPI.linkedBarcodeScannerDevice().then(setScanner);
  };

  // Trigger a manual scan with keyboard input
  const triggerManualScan = useCallback((barcode: string) => {
    if (barcode) {
      manualScanCallbackRef.current(parseResult(barcode));
    }
  }, []);

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
      // Honeywell is considered always connected if available
      isConnected:
        activeScanner === AvailableScannerType.Manual ||
        activeScanner === AvailableScannerType.Honeywell ||
        activeScanner === AvailableScannerType.Camera ||
        !!scanner?.connected,
      isScanning,
      setScanner,
      scan,
      startScanning,
      setScannerType,
      stopScan,
      scannerType: localScannerType,
      availableScanners,
      activeScanner,
      setActiveScanner,
      triggerManualScan,
    }),
    [
      isEnabled,
      scan,
      stopScan,
      startScanning,
      scanner,
      localScannerType,
      isScanning,
      setScannerType,
      availableScanners,
      activeScanner,
      triggerManualScan,
    ]
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
