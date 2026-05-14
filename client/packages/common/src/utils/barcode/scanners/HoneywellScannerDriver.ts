import { HoneywellScannerPlugin } from '@common/hooks';
import { AvailableScannerType, ScannerDriver } from './types';

export const createHoneywellScannerDriver = (
  scanner: HoneywellScannerPlugin,
  onError: (msg: string) => void
): ScannerDriver => ({
  type: AvailableScannerType.Honeywell,
  isConnected: true,
  supportsContinuousScanning: true,

  async scan() {
    // Honeywell is always in listen mode — use startListening instead
    return undefined;
  },

  async startListening(onScan: (barcode: string) => void) {
    await scanner.listen({}, (data, err) => {
      if (err) {
        console.error('Honeywell scanning error:', err);
        return;
      }
      if (data && 'barcode' in data) {
        onScan(data.barcode);
      } else if (data && 'error' in data) {
        console.error('Honeywell scanning error:', data.error);
        onError(data.error);
      }
    });
  },

  async stop() {
    try {
      await scanner.release();
    } catch (error) {
      console.error('Error releasing Honeywell scanner:', error);
    }
  },
});
