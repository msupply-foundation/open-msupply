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

export interface UseHoneywellScannerProps {
  onScan?: (barcode: string) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

// Export the plugin directly for advanced usage
export { HoneywellScanner };
