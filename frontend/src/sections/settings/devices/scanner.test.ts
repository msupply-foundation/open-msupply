import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockScannerEnabled, setMockScannerEnabled } from './scanner';
import { refreshScanSources } from '../../../platform/barcodeScanner';

// appData is localStorage-backed and localStorage is absent under node. Stub
// the GLOBAL rather than mocking appData, so the real persistence code runs.
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
});

afterEach(async () => {
  setMockScannerEnabled(false);
  await refreshScanSources();
  vi.unstubAllGlobals();
});

// rules § Devices — barcode scanner: the toggle is remembered ON THIS DEVICE
// and never sent to the server.
describe('the manual-input toggle is device-local', () => {
  it('holds the choice in a signal both screens read', () => {
    setMockScannerEnabled(true);
    expect(mockScannerEnabled()).toBe(true);
    setMockScannerEnabled(false);
    expect(mockScannerEnabled()).toBe(false);
  });

  it('persists it to this device only', () => {
    setMockScannerEnabled(true);
    const stored = localStorage.getItem('open-mSupply-app-data');
    expect(stored).toContain('mockBarcodeScannerEnabled');
  });
});
