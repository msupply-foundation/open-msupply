import { NativeAPI } from '@common/hooks';
import { BarcodeUtils } from '../BarcodeUtils';
import { AvailableScannerType, ScannerDriver } from './types';

const SCAN_TIMEOUT_IN_MS = 50000;

export const createElectronUSBScannerDriver = (
  electronNativeAPI: NativeAPI,
  isDeviceConnected: boolean
): ScannerDriver => ({
  type: AvailableScannerType.ElectronUSB,
  isConnected: isDeviceConnected,
  supportsContinuousScanning: true,

  async scan() {
    const timeoutPromise = new Promise<undefined>((_, reject) =>
      setTimeout(reject, SCAN_TIMEOUT_IN_MS, 'Scan timed out')
    );
    await electronNativeAPI.startBarcodeScan();

    const barcodePromise = new Promise<string | undefined>(resolve => {
      electronNativeAPI.onBarcodeScan((_event, data) =>
        resolve(BarcodeUtils.parseBarcodeFromBytes(data))
      );
    });
    return Promise.race([timeoutPromise, barcodePromise]);
  },

  async startListening(onScan: (barcode: string) => void) {
    await electronNativeAPI.startBarcodeScan();
    electronNativeAPI.onBarcodeScan((_event, data) => {
      const barcode = BarcodeUtils.parseBarcodeFromBytes(data);
      if (barcode) {
        onScan(barcode);
      }
    });
  },

  async stop() {
    await electronNativeAPI.stopBarcodeScan();
  },
});
