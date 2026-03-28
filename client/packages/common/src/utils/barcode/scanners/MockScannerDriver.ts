import { AvailableScannerType, ScannerDriver } from './types';

type MockScannerApi = {
  scan: () => Promise<string>;
  startListening: (handler: (barcode: string) => void) => Promise<void>;
  stopListening: () => Promise<void>;
};

export const createMockScannerDriver = (
  enabled: boolean,
  mockScanner: MockScannerApi
): ScannerDriver => ({
  type: AvailableScannerType.Mock,
  isConnected: true,
  supportsContinuousScanning: true,

  async scan() {
    if (!enabled) return undefined;
    return mockScanner.scan();
  },

  async startListening(onScan: (barcode: string) => void) {
    await mockScanner.startListening(onScan);
  },

  async stop() {
    await mockScanner.stopListening();
  },
});
