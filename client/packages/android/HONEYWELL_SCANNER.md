# Honeywell Scanner Integration

This document describes the native Capacitor plugin integration for Honeywell barcode scanners.

## Overview

The Honeywell Scanner functionality has been migrated from a Cordova plugin to a native Capacitor plugin for better integration, easier debugging, and improved maintainability.

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

**Location**: `/packages/android/app/libs/DataCollection.jar`

This is the Honeywell AIDC SDK library that provides the barcode scanning functionality. It's automatically included in the build via the `fileTree` dependency in `app/build.gradle`.

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

### Basic Hook Usage

```typescript
import { useHoneywellScanner } from '@common/hooks';

function MyComponent() {
  const { release, checkAvailable, isAvailable } = useHoneywellScanner({
    onScan: (barcode) => {
      console.log('Scanned:', barcode);
    },
    onError: (error) => {
      console.error('Scan error:', error);
    },
    enabled: true, // Optional, defaults to true
  });

  if (!isAvailable) {
    return <div>Scanner not available on this device</div>;
  }

  const handleCheckAvailable = async () => {
    const available = await checkAvailable();
    console.log('Scanner available:', available);
  };

  return (
    <div>
      <button onClick={handleCheckAvailable}>Check Available</button>
      <button onClick={release}>Release Scanner</button>
    </div>
  );
}
```

### Manual Control

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

// Release the scanner (useful before pause)
await HoneywellScanner.release();

// Check if scanner is available
const { available } = await HoneywellScanner.available();
```

## API Reference

### Plugin Methods

#### `listen(options, callback): Promise<string>`

Sets up a callback to receive scan events and automatically claims exclusive access to the scanner. The callback receives:

- First parameter: `{ barcode: string }` on successful scan, `{ error: string }` on scan failure, or `null`
- Second parameter: error object if an error occurred

Called automatically when using the `useHoneywellScanner` hook with `enabled: true`.

#### `release(): Promise<void>`

Releases the scanner. Called automatically on app pause. Can be called manually if you need to release the scanner temporarily.

#### `available(): Promise<{ available: boolean }>`

Checks if the scanner hardware is available.

### Hook API

The `useHoneywellScanner` hook returns:

```typescript
{
  release: () => Promise<void>; // Release scanner
  checkAvailable: () => Promise<boolean>; // Check availability
  isAvailable: boolean; // True if on Android native platform
}
```

**Note**: The hook automatically sets up the listener when `enabled: true` (default). The scanner is automatically claimed when the listener is set up, so there's no need for manual `claim()` or `startScan()` calls.

## Barcode Symbologies Supported

The following barcode types are enabled by default:

- Code 128
- GS1-128
- QR Code
- Code 39 (max length: 10)
- Data Matrix
- UPC-A
- EAN-13
- EAN-8
- Aztec
- Codabar
- Interleaved 2 of 5
- PDF 417

## Configuration

Scanner properties are configured in the `configureBarcodeReader()` method in `HoneywellScannerPlugin.java`. You can modify the following settings:

```java
properties.put(BarcodeReader.PROPERTY_CODE_128_ENABLED, true);
properties.put(BarcodeReader.PROPERTY_CENTER_DECODE, false);
properties.put(BarcodeReader.PROPERTY_CODE_39_MAXIMUM_LENGTH, 10);
// ... and many more
```

## Lifecycle Management

The plugin automatically handles scanner lifecycle:

- **On Load**: Scanner is initialized and configured
- **On Listen**: Scanner is claimed when the listener is set up
- **On Resume**: Scanner is reclaimed
- **On Pause**: Scanner is released
- **On Destroy**: Scanner resources are cleaned up

## Migration from Cordova Plugin

### Before (Cordova)

```javascript
// Using cordova plugin
window.cordova.plugins.honeywell.nativeListen(
  barcode => console.log(barcode),
  error => console.error(error)
);
```

### After (Capacitor)

```typescript
import { useHoneywellScanner } from '@common/hooks';

const { isAvailable } = useHoneywellScanner({
  onScan: barcode => console.log(barcode),
  onError: error => console.error(error),
});
```

## Troubleshooting

### Scanner Not Available

- Ensure you're running on a physical Honeywell device with scanner hardware
- Check that DataCollection.jar is in `/packages/android/app/libs/`
- Verify the plugin is registered in `MainActivity.java`

### Scanner Not Responding

- The scanner is automatically claimed when you set up the listener with the hook or call `listen()` directly
- Check Android logs for error messages
- Ensure no other app is using the scanner

### Build Errors

- Verify DataCollection.jar exists in the correct location
- Check that `build.gradle` includes `implementation fileTree(include: ['*.jar'], dir: 'libs')`
- Clean and rebuild the project

## Development and Debugging

Since this is now native code, you can:

1. Set breakpoints in `HoneywellScannerPlugin.java`
2. Use Android Studio's debugger
3. View logs with `adb logcat | grep HoneywellScanner`
4. Modify scanner properties without rebuilding the Cordova plugin

## Files Modified/Created

### Created

- `/packages/android/app/src/main/java/org/openmsupply/client/HoneywellScannerPlugin.java`
- `/packages/android/app/libs/DataCollection.jar`
- `/packages/common/src/hooks/useHoneywellScanner/useHoneywellScanner.ts`
- `/packages/common/src/hooks/useHoneywellScanner/index.ts`

### Modified

- `/packages/android/app/src/main/java/org/openmsupply/client/MainActivity.java`
- `/packages/common/src/hooks/index.ts`

### Can Be Removed (Optional)

- `/packages/android/capacitor-cordova-android-plugins/` (if no other Cordova plugins)
- `cordova-honeywell-plugin` npm dependency
