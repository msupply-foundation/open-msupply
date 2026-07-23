import { afterEach, describe, expect, it } from 'vitest';
import {
  availableScanners,
  MOCK_SCANNER_NAME,
  scannerConnected,
  scanningEnabled,
  setMockScannerEnabled,
  triggerMockScan,
} from './scanner';

afterEach(() => setMockScannerEnabled(false));

// AC-BS3 — the mock scanner is a testing aid: enabling it simulates a
// connected scanner with no real hardware; everything derives locally from
// the toggle.
describe('AC-BS3 — mock scanner simulates a connected scanner locally', () => {
  it('reports no scanning capability with the mock off (web build has no hardware plugin)', () => {
    expect(scanningEnabled()).toBe(false);
    expect(scannerConnected()).toBe(false);
    expect(availableScanners()).toEqual([]);
  });

  it('reports enabled + connected + the mock device with the mock on', () => {
    setMockScannerEnabled(true);
    expect(scanningEnabled()).toBe(true);
    expect(scannerConnected()).toBe(true);
    expect(availableScanners()).toEqual([MOCK_SCANNER_NAME]);
  });
});

// AC-BS2 — Test scanner records nothing server-side: a triggered scan is a
// purely local value (this module makes no request of any kind — it has no
// network imports; the returned result is data for the screen's local list).
describe('AC-BS2 — scans are produced locally', () => {
  it('produces a barcode result with a stable shape', () => {
    const result = triggerMockScan();
    expect(result.barcode).toContain('(01)');
    expect(result.id).not.toBe('');
    expect(result.scannedAt).toBeInstanceOf(Date);
  });

  it('produces distinct results so the list visibly accumulates', () => {
    const first = triggerMockScan();
    const second = triggerMockScan();
    expect(second.id).not.toBe(first.id);
    expect(second.barcode).not.toBe(first.barcode);
  });
});
