# Honeywell Scanner Integration

Open-mSupply has an android integration for the Honeywell CK65 device with built in laser barcode scanner. This might work for other honeywell devices with the similar hardware, but has only been tested on the CK65. The integration is done via a Capacitor plugin that interfaces with the Honeywell AIDC SDK.

## References

The Honeywell Scanner functionality has been migrated from a Cordova plugin based on https://github.com/kulkarniswapnil/cordova-honeywell-plugin to a native Capacitor plugin.
This intern is based on sample code from the Honeywell Mobility Edge SDK for Android (which is included in this codebase).

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

**Location**: `/packages/android/app/src/main/java/org/openmsupply/client/HoneywellScannerPlugin.java`

This is a Capacitor plugin that interfaces directly with the Honeywell AIDC SDK via the `DataCollection.jar` library.

**Key Features**:

- Automatic initialization and configuration on plugin load
- Support for multiple barcode symbologies (Code 128, GS1-128, QR Code, Data Matrix, etc.)
- Event-based barcode scanning with callbacks
- Automatic scanner claiming when listener is set up
- Scanner lifecycle management (claim/release)
- Automatic scanner cleanup on app pause/resume/destroy

### JAR Library

**Location**: `/packages/android/app/libs/DataCollection.aar`

This is the Honeywell AIDC SDK library that provides the barcode scanning functionality. It's automatically included in the build via the `implementation(name: 'DataCollection', ext: 'aar')` dependency in `app/build.gradle`.

### TypeScript Wrapper

**Location**: `/packages/common/src/hooks/useHoneywellScanner/`

React hook and TypeScript interfaces for easy integration in the app code.

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

### Plugin Methods

#### `listen(options, callback): Promise<string>`

Sets up a callback to receive scan events and automatically claims exclusive access to the scanner. Returns a Promise that resolves with a callback ID.

The callback receives two parameters:

- **data**: `{ barcode: string }` on successful scan, `{ error: string }` on scan failure, or `null` if an error occurred
- **error**: Error object if the callback itself failed (e.g., scanner unavailable)

Called automatically when using the `useHoneywellScanner` hook with `enabled: true`.

#### `available(): Promise<{ available: boolean }>`

Checks if the scanner hardware is available.

## Configuration

Scanner properties are configured in the `configureBarcodeReader()` method in `HoneywellScannerPlugin.java`. You can modify the following settings:

```java
properties.put(BarcodeReader.PROPERTY_CODE_128_ENABLED, true);
properties.put(BarcodeReader.PROPERTY_CENTER_DECODE, false);
properties.put(BarcodeReader.PROPERTY_CODE_39_MAXIMUM_LENGTH, 10);
// See the docs for all available properties in BarcodeReader.html
```

## Lifecycle Management

The plugin automatically handles scanner lifecycle:

- **On Load**: Scanner is initialized and configured
- **On Listen**: Scanner is claimed when the listener is set up
- **On Resume**: Scanner is reclaimed
- **On Pause**: Scanner is released
- **On Destroy**: Scanner resources are cleaned up

## Troubleshooting

## Development and Debugging

Since this is now native code, you can:

1. Set breakpoints in `HoneywellScannerPlugin.java`
2. Use Android Studio's debugger
3. View logs with `adb logcat | grep HoneywellScanner`
