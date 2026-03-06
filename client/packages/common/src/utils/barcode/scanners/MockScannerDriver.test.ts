import { createMockScannerDriver } from './MockScannerDriver';

describe('MockScannerDriver', () => {
  const createMockApi = () => ({
    scan: jest.fn().mockResolvedValue('mock-barcode-123'),
    startListening: jest.fn().mockResolvedValue(undefined),
    stopListening: jest.fn().mockResolvedValue(undefined),
  });

  it('returns correct type and properties', () => {
    const mockApi = createMockApi();
    const driver = createMockScannerDriver(true, mockApi);

    expect(driver.type).toBe('mock');
    expect(driver.isConnected).toBe(true);
    expect(driver.supportsContinuousScanning).toBe(true);
  });

  it('delegates scan to mock scanner API', async () => {
    const mockApi = createMockApi();
    const driver = createMockScannerDriver(true, mockApi);

    const result = await driver.scan();
    expect(mockApi.scan).toHaveBeenCalled();
    expect(result).toBe('mock-barcode-123');
  });

  it('returns undefined when not enabled', async () => {
    const mockApi = createMockApi();
    const driver = createMockScannerDriver(false, mockApi);

    const result = await driver.scan();
    expect(mockApi.scan).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('delegates startListening to mock scanner API', async () => {
    const mockApi = createMockApi();
    const driver = createMockScannerDriver(true, mockApi);
    const handler = jest.fn();

    await driver.startListening(handler);
    expect(mockApi.startListening).toHaveBeenCalledWith(handler);
  });

  it('delegates stop to mock scanner API', async () => {
    const mockApi = createMockApi();
    const driver = createMockScannerDriver(true, mockApi);

    await driver.stop();
    expect(mockApi.stopListening).toHaveBeenCalled();
  });
});
