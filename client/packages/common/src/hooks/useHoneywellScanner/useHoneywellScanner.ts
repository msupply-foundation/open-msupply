import { registerPlugin } from '@capacitor/core';

export interface HoneywellScannerPlugin {
  listen(
    options: object,
    callback: (
      data: { barcode: string } | { error: string } | null,
      error?: any
    ) => void
  ): Promise<string>;
  release(): Promise<void>;
  available(): Promise<{ available: boolean }>;
}

const HoneywellScanner =
  registerPlugin<HoneywellScannerPlugin>('HoneywellScanner');

export { HoneywellScanner };
