# Barcode Scanner Context Refactoring Plan

## Issue
[#10399](https://github.com/msupply-foundation/open-msupply/issues/10399) - Improve barcode scanner context readability

## Problem
`BarcodeScannerContext.tsx` (549 lines) is a monolithic file containing all scanner-type-specific logic intermixed in `switch/case` blocks and `if` chains. Each method (`scanBarcode`, `startListening`, `stopScan`, availability detection) has branching for every scanner type, making it hard to maintain and review.

## Proposed Solution
Extract a common `ScannerDriver` interface that each scanner type implements. The context provider iterates over registered drivers instead of containing inline logic per scanner type.

---

## Common Interface

```typescript
// barcode/scanners/types.ts

import { BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { ScanResult, ScanCallback } from '../BarcodeScannerContext';

/**
 * Common interface implemented by each scanner type.
 * The context iterates through available drivers for scanning operations.
 */
export interface ScannerDriver {
  /** Unique identifier for this scanner type */
  readonly type: AvailableScannerType;

  /**
   * Check if this scanner type is available on the current platform.
   * Called once on mount and when dependencies change.
   * May be async (e.g. Honeywell checks plugin availability via native bridge).
   */
  isAvailable(): boolean | Promise<boolean>;

  /**
   * Whether a physical device is connected and ready (or always true for
   * camera/mock which don't require pairing).
   */
  isConnected(): boolean;

  /**
   * Whether this scanner supports continuous listening mode.
   * Camera scanner does NOT (one-off scan only).
   */
  readonly supportsContinuousScanning: boolean;

  /**
   * Perform a one-off scan. Returns raw barcode string.
   * For camera scanner: opens camera UI. For mock: opens dialog.
   * For USB/Honeywell: waits for next scan event.
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

// Note: renderUI() was removed from the interface. MockScanner's input dialog
// is rendered directly in the provider, and camera hideApp styling is managed
// via a setHideApp callback passed to the CameraScannerDriver.
```

## Driver Implementations

### 1. `MockScannerDriver`
**File:** `barcode/scanners/MockScannerDriver.tsx`

- Wraps the existing `useMockScanner` hook (keeps the React UI logic as-is)
- `isAvailable()` → checks `localStorage` mock-enabled flag
- `isConnected()` → always `true` when enabled
- `supportsContinuousScanning` → `true`
- `scan()` → delegates to `MockScanner.scan()`
- `startListening(onScan)` → delegates to `MockScanner.startListening(onScan)`
- `stop()` → delegates to `MockScanner.stopListening()`
- `renderUI()` → returns `MockScanner.scannerInput`

### 2. `CameraScannerDriver`
**File:** `barcode/scanners/CameraScannerDriver.ts`

- `isAvailable()` → `Capacitor.isPluginAvailable('BarcodeScanner') && Capacitor.isNativePlatform()` (also checks Honeywell is NOT available, as camera is disabled on Honeywell devices)
- `isConnected()` → `Capacitor.isNativePlatform()` (always connected on native)
- `supportsContinuousScanning` → `false`
- `scan(formats?)` → handles Google Barcode Scanner module install check, then opens camera (with the `hideApp` global styles logic)
- `startListening()` → no-op (camera doesn't support continuous scanning)
- `stop()` → `BarcodeScannerPlugin.removeAllListeners()` + `stopScan()`

### 3. `ElectronUSBScannerDriver`
**File:** `barcode/scanners/ElectronUSBScannerDriver.ts`

- `isAvailable()` → `!!window.electronNativeAPI`
- `isConnected()` → checks `scanner?.connected` state
- `supportsContinuousScanning` → `true`
- `scan(formats?)` → starts USB scan, waits for `onBarcodeScan` event, parses bytes, with timeout
- `startListening(onScan)` → starts USB scan, registers `onBarcodeScan` callback that parses bytes and calls `onScan`
- `stop()` → `electronNativeAPI.stopBarcodeScan()`
- Also exposes scanner device info methods (`setScanner`, `setScannerType`, `linkedBarcodeScannerDevice`, `getScannerType`) — these are Electron-specific extras beyond the common interface

### 4. `HoneywellScannerDriver`
**File:** `barcode/scanners/HoneywellScannerDriver.ts`

- `isAvailable()` → async check via `HoneywellScanner.available()`
- `isConnected()` → `true` when available (hardware scanner built into device)
- `supportsContinuousScanning` → `true`
- `scan()` → not typical usage (Honeywell is always in listen mode), but could wait for next scan event
- `startListening(onScan)` → `HoneywellScanner.listen({}, callback)` that calls `onScan(data.barcode)`
- `stop()` → `HoneywellScanner.release()`

---

## Refactored Context Structure

```
client/packages/common/src/utils/barcode/
├── index.ts                          (re-exports)
├── BarcodeUtils.ts                   (unchanged)
├── BarcodeUtils.test.ts              (unchanged)
├── BarcodeScannerContext.tsx          (simplified orchestrator)
├── BarcodeScannerContext.test.ts      (unchanged)
├── parseResult.ts                    (extracted from context)
└── scanners/
    ├── index.ts                      (re-exports)
    ├── types.ts                      (ScannerDriver interface)
    ├── MockScannerDriver.tsx         (mock implementation)
    ├── CameraScannerDriver.ts        (camera implementation)
    ├── ElectronUSBScannerDriver.ts   (electron USB implementation)
    └── HoneywellScannerDriver.ts     (honeywell implementation)
```

## Simplified Context Provider (Pseudocode)

```typescript
// BarcodeScannerContext.tsx - after refactoring

export const BarcodeScannerProvider: FC<PropsWithChildrenOnly> = ({ children }) => {
  const t = useTranslation();
  const { error } = useNotification();
  const callbackRef = useRef<ScanCallback | null>(null);

  // Initialize all scanner drivers
  const mockDriver = useMockScannerDriver();
  const cameraDriver = useCameraScannerDriver();
  const electronDriver = useElectronUSBScannerDriver();
  const honeywellDriver = useHoneywellScannerDriver();

  const allDrivers = [mockDriver, cameraDriver, electronDriver, honeywellDriver];

  // Determine which scanners are available
  const [availableDrivers, setAvailableDrivers] = useState<ScannerDriver[]>([]);

  useEffect(() => {
    Promise.all(
      allDrivers.map(async driver => ({
        driver,
        available: await driver.isAvailable(),
      }))
    ).then(results =>
      setAvailableDrivers(results.filter(r => r.available).map(r => r.driver))
    );
  }, [/* relevant deps */]);

  const isEnabled = availableDrivers.length > 0;

  // Scan: use first available driver that supports one-off scan
  const scan = useCallback(async (formats?: BarcodeFormat[]) => {
    for (const driver of availableDrivers) {
      try {
        const barcode = await driver.scan(formats);
        return parseResult(barcode);
      } catch (e) { /* handle cancel/error */ }
    }
    return {};
  }, [availableDrivers]);

  // Start listening: activate all drivers that support continuous scanning
  const startListening = useCallback(async () => {
    const onBarcode = (barcode: string) => {
      const result = parseResult(barcode);
      callbackRef.current?.(result);
    };
    for (const driver of availableDrivers) {
      if (driver.supportsContinuousScanning) {
        await driver.startListening(onBarcode);
      }
    }
  }, [availableDrivers]);

  // Stop: stop all drivers
  const stopScan = useCallback(async () => {
    await Promise.all(availableDrivers.map(d => d.stop()));
  }, [availableDrivers]);

  // ... rest of context value construction (much simpler)

  return (
    <Provider value={val}>
      {availableDrivers.map(d => d.renderUI?.())}
      {/* hideApp GlobalStyles managed by CameraScannerDriver */}
      {children}
    </Provider>
  );
};
```

## Key Design Decisions

1. **Drivers as hooks** — Each driver is instantiated via a custom hook (e.g. `useMockScannerDriver()`) because some drivers need React state (MockScanner needs UI rendering, CameraScanner needs `hideApp` state). This keeps them composable within the React tree.

2. **`parseResult` extracted** — The `parseResult` function is pure (no React deps) and can live in its own file, keeping the context focused on orchestration.

3. **Priority ordering** — The `allDrivers` array order determines scan priority (mock first for dev, then platform-specific). This matches current behavior where `mockScannerEnabled` is checked first in the `switch`.

4. **Electron-specific extras** — `setScannerType`, `setScanner`, `linkedBarcodeScannerDevice` etc. remain on the context interface but are only relevant when `ElectronUSBScannerDriver` is available. The driver exposes these as additional methods beyond the common interface.

5. **Camera `hideApp` styling** — The `GlobalStyles` hack for hiding the app during camera scanning moves into `CameraScannerDriver.renderUI()`, keeping it co-located with the camera logic.

6. **Backward compatible** — All existing exports (`BarcodeScannerControl`, `ScanResult`, `useBarcodeScannerContext`, `parseResult`, `AvailableScannerType`) remain unchanged. No changes to consumers.

## Migration Steps

1. Create `barcode/scanners/types.ts` with the `ScannerDriver` interface
2. Extract `parseResult` to `barcode/parseResult.ts`
3. Implement each driver file
4. Refactor `BarcodeScannerContext.tsx` to use drivers
5. Update `barcode/index.ts` exports
6. Verify existing tests pass
7. Verify existing imports/re-exports still work (no breaking changes)

## What Stays Unchanged
- `BarcodeUtils.ts` and its tests
- `MockBarcodeScanner.tsx` (the UI component — driver wraps it)
- `useHoneywellScanner.ts` (the Capacitor plugin registration — driver wraps it)
- `types.ts` in `useNativeClient` (BarcodeScanner, ScannerType types)
- All consumer code (invoices, coldchain, stock, settings, etc.)
- The `BarcodeScannerControl` interface shape (context value)
