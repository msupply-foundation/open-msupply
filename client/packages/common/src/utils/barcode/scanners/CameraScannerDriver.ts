import {
  BarcodeFormat,
  BarcodeScanner as BarcodeScannerPlugin,
  GoogleBarcodeScannerModuleInstallProgressEvent,
  GoogleBarcodeScannerModuleInstallState,
} from '@capacitor-mlkit/barcode-scanning';
import { AvailableScannerType, ScannerDriver } from './types';

const INSTALL_TIMEOUT_IN_MS = 30000;

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

export const createCameraScannerDriver = (
  setHideApp: (hide: boolean) => void,
  errorMessage: string
): ScannerDriver => ({
  type: AvailableScannerType.Camera,
  isConnected: true,
  supportsContinuousScanning: false,

  async scan(formats?: BarcodeFormat[]) {
    const installTimeoutPromise = new Promise<undefined>((_, reject) =>
      setTimeout(reject, INSTALL_TIMEOUT_IN_MS, 'Install timed out')
    );
    const isInstalled = await Promise.race([
      installTimeoutPromise,
      googleBarcodeScannerAvailable(),
    ]);

    if (!isInstalled) {
      throw new Error(errorMessage);
    }

    // Hide the app to show camera view
    setHideApp(true);
    try {
      const { barcodes } = await BarcodeScannerPlugin.scan({
        autoZoom: true,
        formats,
      });

      if (barcodes && barcodes.length > 0 && barcodes[0]) {
        return barcodes[0].rawValue;
      }
      return '';
    } finally {
      setHideApp(false);
    }
  },

  async startListening() {
    // Camera doesn't support continuous scanning
  },

  async stop() {
    setHideApp(false);
    await BarcodeScannerPlugin.removeAllListeners();
    await BarcodeScannerPlugin.stopScan();
  },
});
