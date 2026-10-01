# Honeywell Scanner Integration

Open-mSupply has an android integration for the Honeywell CK65 device with built in laser barcode scanner. This might work for other honeywell devices with the similar hardware, but has only been tested on the CK65. The integration is done via a Capacitor plugin that interfaces with the Honeywell AIDC SDK.

## References

The Honeywell Scanner functionality has been migrated from a Cordova plugin based on https://github.com/kulkarniswapnil/cordova-honeywell-plugin to a native Capacitor plugin.

We've choosed to create our own plugin instead of using one of the existing Cordova/Capcitor plugins for several reasons:

1. There doesn't seem to be any heavily used and well-maintained Capacitor plugins for Honeywell scanners.
2. The existing plugin didn't have a mechanism to detect if the scanner is actually available, which is important for our use case.
3. By creating our own plugin, we have better software supply chain confidence, relying directly on Honeywell's download rather than a jar provided by a third party npm package.

To download the last SDK you need a to create a honeywll account and visit.
https://hsmftp.honeywell.com/ - The honeywell download server.
Navigate to: Software > Software and Tools > Developer Library > SDKs for Android
Note: to download you need to install the honeywell download manager, which is only available for windows.

Current version of the sdk: V1.97.00.0084

## Architecture

### Native Android Plugin

**Location**: `frontend/android/app/src/shared/java/org/openmsupply/client/HoneywellScannerPlugin.java`

It lives in the new Android shell's `src/shared/` folder, which both Android projects compile (see `frontend/android/app/src/shared/README.md`), so this APK and the new shell run the same plugin.

This is a Capacitor plugin that interfaces directly with the Honeywell AIDC SDK via the `DataCollection.jar` library.

**Key Features**:

- Automatic initialization and configuration on plugin load
- Support for multiple barcode symbologies (Code 128, GS1-128, QR Code, Data Matrix, etc.)
- Event-based barcode scanning with callbacks
- The scanner is claimed whenever the app is in the foreground, so the device's keyboard wedge doesn't type scans into focused fields
- Scanner lifecycle management (claim/release)
- Automatic scanner cleanup on app pause/resume/destroy

### JAR Library

**Location**: `frontend/android/app/libs/HoneywellScanner.aar`

This is the Honeywell AIDC SDK library that provides the barcode scanning functionality. It's included in both builds via the `implementation(name: 'HoneywellScanner', ext: 'aar')` dependency in each `app/build.gradle`; this project's `flatDir` points at the new shell's `libs` folder.

### TypeScript Wrapper

**Location**: `/packages/common/src/hooks/useHoneywellScanner/`

React hook and TypeScript interfaces for easy integration in the app code. Uses the legacy surface below.

The new front end's wrapper is `frontend/src/platform/barcodeSources/honeywell.ts`, and uses the current surface.

## Registration

The plugin is registered in `MainActivity.java`:

```java
registerPlugin(HoneywellScannerPlugin.class);
```

This makes it available to the Capacitor bridge under the name `HoneywellScanner`.

## Usage

```typescript
import { HoneywellScanner } from '@common/hooks';

// Listen for scan events (automatically claims the scanner)
await HoneywellScanner.listen({}, (data, error) => {
  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && 'barcode' in data) {
    console.log('Scanned:', data.barcode);
  } else if (data && 'error' in data) {
    console.error('Error:', data.error);
  }
});

// Check if scanner is available
const { available } = await HoneywellScanner.available();
```

## API Reference

The plugin has two surfaces. The **current** one is used by the new front end. The **legacy** one is kept unchanged for the old front end, which can still be served into this APK by older servers.

### Current surface

#### `status(): Promise<{ apiVersion: number, available: boolean, claimed: boolean }>`

Waits for the SDK to finish starting (up to 5 s) before answering, so an early call gets the real answer. Answers immediately on non-Honeywell devices. APKs older than this surface reject the call.

#### `arm(): Promise<void>`

Makes sure the scanner is claimed (reclaiming it if another app took it). Rejects with the reason if it can't be claimed.

#### `trigger({ on: boolean, timeoutMs?: number }): Promise<void>`

Presses or releases the trigger from software. A press releases itself after `timeoutMs` (default 5000) or on the first read.

#### Events

- `scan`: `{ data: string, aimId: string, codeId: string }` per successful read. `aimId` is the AIM symbology identifier (e.g. `]C1` for GS1-128).
- `failure`: `{}` per no-read (usually the trigger released with nothing in the beam).

Subscribe with `addListener('scan', handler)`.

### Legacy surface

#### `listen(options, callback): Promise<string>`

Sets up a callback to receive scan events and automatically claims exclusive access to the scanner. Returns a Promise that resolves with a callback ID. A second `listen` replaces the first callback.

The callback receives two parameters:

- **data**: `{ barcode: string }` on successful scan, or `null` if an error occurred
- **error**: Error object on a no-read (`"Scan has failed"`) or if the callback itself failed (e.g., scanner unavailable)

Called automatically when using the `useHoneywellScanner` hook with `enabled: true`.

#### `available(): Promise<{ available: boolean }>`

Checks if the scanner hardware is available. Waits for the SDK to finish starting, like `status()`.

#### `release(): Promise<void>`

Drops the listen callback and releases the scanner claim. The scanner isn't reclaimed on resume until the next `listen` or `arm`.

## Configuration

Scanner properties are configured in the `configureBarcodeReader()` method in `HoneywellScannerPlugin.java`. You can modify the following settings:

```java
properties.put(BarcodeReader.PROPERTY_CODE_128_ENABLED, true);
properties.put(BarcodeReader.PROPERTY_CENTER_DECODE, false);
// See the docs for all available properties in BarcodeReader.html
```

## Lifecycle Management

The plugin automatically handles scanner lifecycle:

- **On Load**: Scanner is initialized, configured and claimed (Honeywell devices only; other devices skip the SDK entirely)
- **On Listen / Arm**: Scanner is claimed if it isn't already
- **On Resume**: Scanner is reclaimed, unless the legacy `release()` let it go
- **On Pause**: Scanner is released
- **On Destroy**: Scanner resources are cleaned up

## Troubleshooting

## Development and Debugging

Since this is now native code, you can:

1. Set breakpoints in `HoneywellScannerPlugin.java`
2. Use the new front end's Settings → Devices → Test scanner page to see each read's exact characters and symbology ID
3. Use Android Studio's debugger
4. View logs with `adb logcat | grep HoneywellScanner`
