import { BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

export enum AvailableScannerType {
  Mock = 'mock',
  Camera = 'camera',
  ElectronUSB = 'electron_usb',
  Honeywell = 'honeywell',
}

/**
 * Common interface implemented by each scanner type.
 * The context iterates through available drivers for scanning operations.
 */
export interface ScannerDriver {
  /** Unique identifier for this scanner type */
  readonly type: AvailableScannerType;

  /**
   * Whether a physical device is connected and ready (or always true for
   * camera/mock which don't require pairing).
   */
  isConnected: boolean;

  /**
   * Whether this scanner supports continuous listening mode.
   * Camera scanner does NOT (one-off scan only).
   */
  readonly supportsContinuousScanning: boolean;

  /**
   * Perform a one-off scan. Returns raw barcode string.
   */
  scan(formats?: BarcodeFormat[]): Promise<string | undefined>;

  /**
   * Start continuous listening. Invokes `onScan` each time a barcode is read.
   * No-op for scanners that don't support continuous scanning.
   */
  startListening(onScan: (barcode: string) => void): Promise<void>;

  /**
   * Stop scanning / listening and release resources.
   */
  stop(): Promise<void>;
}
