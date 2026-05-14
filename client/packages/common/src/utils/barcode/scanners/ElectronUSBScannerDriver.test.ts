import { createElectronUSBScannerDriver } from './ElectronUSBScannerDriver';
import { NativeAPI } from '@common/hooks';

// Only mock the methods we use
const createMockNativeAPI = () =>
  ({
    startBarcodeScan: jest.fn().mockResolvedValue(undefined),
    stopBarcodeScan: jest.fn().mockResolvedValue(undefined),
    onBarcodeScan: jest.fn(),
  }) as unknown as NativeAPI;

describe('ElectronUSBScannerDriver', () => {
  it('returns correct type and properties', () => {
    const api = createMockNativeAPI();
    const driver = createElectronUSBScannerDriver(api, true);

    expect(driver.type).toBe('electron_usb');
    expect(driver.isConnected).toBe(true);
    expect(driver.supportsContinuousScanning).toBe(true);
  });

  it('reflects device connection state', () => {
    const api = createMockNativeAPI();
    const disconnected = createElectronUSBScannerDriver(api, false);
    expect(disconnected.isConnected).toBe(false);

    const connected = createElectronUSBScannerDriver(api, true);
    expect(connected.isConnected).toBe(true);
  });

  it('starts barcode scan and registers callback on scan()', async () => {
    const api = createMockNativeAPI();
    // Simulate a barcode scan response via onBarcodeScan callback
    (api.onBarcodeScan as jest.Mock).mockImplementation(callback => {
      // Simulate scan event with byte data for "TEST"
      // Header (4 bytes) + payload + null terminator
      callback(null, [0, 0, 0, 0, 84, 69, 83, 84, 0]);
    });

    const driver = createElectronUSBScannerDriver(api, true);
    const result = await driver.scan();

    expect(api.startBarcodeScan).toHaveBeenCalled();
    expect(api.onBarcodeScan).toHaveBeenCalled();
    expect(result).toBe('TEST');
  });

  it('sets up continuous listening with startListening()', async () => {
    const api = createMockNativeAPI();
    const onScan = jest.fn();

    (api.onBarcodeScan as jest.Mock).mockImplementation(callback => {
      // Simulate a scan event
      callback(null, [0, 0, 0, 0, 65, 66, 67, 0]);
    });

    const driver = createElectronUSBScannerDriver(api, true);
    await driver.startListening(onScan);

    expect(api.startBarcodeScan).toHaveBeenCalled();
    expect(onScan).toHaveBeenCalledWith('ABC');
  });

  it('calls stopBarcodeScan on stop()', async () => {
    const api = createMockNativeAPI();
    const driver = createElectronUSBScannerDriver(api, true);

    await driver.stop();
    expect(api.stopBarcodeScan).toHaveBeenCalled();
  });
});
