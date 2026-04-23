import { HoneywellScannerPlugin } from '../../../hooks/useHoneywellScanner/useHoneywellScanner';
import { createHoneywellScannerDriver } from './HoneywellScannerDriver';

const createMockHoneywellScanner = (): jest.Mocked<HoneywellScannerPlugin> => ({
  listen: jest.fn().mockResolvedValue('listener-id'),
  release: jest.fn().mockResolvedValue(undefined),
  available: jest.fn().mockResolvedValue({ available: true }),
});

describe('HoneywellScannerDriver', () => {
  it('returns correct type and properties', () => {
    const scanner = createMockHoneywellScanner();
    const driver = createHoneywellScannerDriver(scanner, jest.fn());

    expect(driver.type).toBe('honeywell');
    expect(driver.isConnected).toBe(true);
    expect(driver.supportsContinuousScanning).toBe(true);
  });

  it('scan() returns undefined (use startListening instead)', async () => {
    const scanner = createMockHoneywellScanner();
    const driver = createHoneywellScannerDriver(scanner, jest.fn());
    const result = await driver.scan();
    expect(result).toBeUndefined();
  });

  it('startListening() calls HoneywellScanner.listen', async () => {
    const scanner = createMockHoneywellScanner();
    const onScan = jest.fn();
    const driver = createHoneywellScannerDriver(scanner, jest.fn());

    await driver.startListening(onScan);
    expect(scanner.listen).toHaveBeenCalledWith({}, expect.any(Function));
  });

  it('invokes onScan when barcode data is received', async () => {
    const scanner = createMockHoneywellScanner();
    const onScan = jest.fn();
    scanner.listen.mockImplementation((_opts, callback) => {
      callback({ barcode: '01095011015300031714070410AB-123' }, null);
      return Promise.resolve('listener-id');
    });

    const driver = createHoneywellScannerDriver(scanner, jest.fn());
    await driver.startListening(onScan);

    expect(onScan).toHaveBeenCalledWith('01095011015300031714070410AB-123');
  });

  it('calls onError when scanner reports error in data', async () => {
    const scanner = createMockHoneywellScanner();
    const onError = jest.fn();
    scanner.listen.mockImplementation((_opts, callback) => {
      callback({ error: 'scanner malfunction' }, null);
      return Promise.resolve('listener-id');
    });

    const driver = createHoneywellScannerDriver(scanner, onError);
    await driver.startListening(jest.fn());

    expect(onError).toHaveBeenCalledWith('scanner malfunction');
  });

  it('stop() calls HoneywellScanner.release', async () => {
    const scanner = createMockHoneywellScanner();
    const driver = createHoneywellScannerDriver(scanner, jest.fn());
    await driver.stop();
    expect(scanner.release).toHaveBeenCalled();
  });

  it('stop() handles release errors gracefully', async () => {
    const scanner = createMockHoneywellScanner();
    scanner.release.mockRejectedValueOnce(new Error('release failed'));

    const driver = createHoneywellScannerDriver(scanner, jest.fn());
    // Should not throw
    await driver.stop();
  });
});
