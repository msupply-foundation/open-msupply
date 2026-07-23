// Barcode-scanner device state (spec/settings/rules.md § Devices — barcode
// scanner). Entirely local-device: no GraphQL or REST surface exists for this
// section (contract § Devices — barcode scanner), and nothing scanned is ever
// recorded server-side (AC-BS2, AC-BS3).
//
// This web/desktop build has no hardware scanning plugin (the mobile plugin /
// Electron native API live with the android/electron hosts — which screens
// consume a scan is owned by spec/android, not here). So the only scanner this
// diagnostic surface can ever see is the MOCK one: enabling the mock simulates
// a connected scanner for testing without real hardware, and MUST NOT be
// relied on for normal store operation (AC-BS3). The toggle is remembered on
// this device (rules § Devices — barcode scanner), persisted via appData like
// the label printer's USB preference; a module-level signal carries it across
// the Settings ↔ Test-scanner navigation.

import { createSignal } from 'solid-js';
import {
  getMockBarcodeScannerEnabled,
  setMockBarcodeScannerEnabled as persistMockScannerEnabled,
} from '../../../appData';

// The reference app renders this scanner's display name as a literal,
// untranslated string (⚠️ i18n gap captured as-is by the spec —
// spec/settings/ui-surface.md § Devices).
export const MOCK_SCANNER_NAME = 'Mock Scanner';

const [mockScannerEnabled, setMockScannerSignal] = createSignal(
  getMockBarcodeScannerEnabled()
);
export { mockScannerEnabled };

export const setMockScannerEnabled = (enabled: boolean): void => {
  setMockScannerSignal(enabled);
  // Persistence is best-effort (no localStorage under node vitest) — the
  // signal is the in-session truth either way.
  try {
    persistMockScannerEnabled(enabled);
  } catch {
    /* ignore */
  }
};

// Read directly from the device, never the server (rules § Devices — barcode
// scanner): with no hardware plugin on this build, everything derives from
// the mock toggle.
export const scanningEnabled = (): boolean => mockScannerEnabled();
export const scannerConnected = (): boolean => mockScannerEnabled();
export const availableScanners = (): string[] =>
  mockScannerEnabled() ? [MOCK_SCANNER_NAME] : [];

export type ScanResult = {
  id: string;
  barcode: string;
  scannedAt: Date;
};

// One simulated scan — a canned GS1-style barcode, generated locally with no
// server round-trip (AC-BS2). Content varies per scan so the results list
// visibly accumulates distinct entries.
let mockScanCounter = 0;
export const triggerMockScan = (): ScanResult => {
  mockScanCounter += 1;
  return {
    id: crypto.randomUUID(),
    barcode: `(01)0935560700${String(mockScanCounter % 100).padStart(2, '0')}(17)260731(10)MOCK${mockScanCounter}`,
    scannedAt: new Date(),
  };
};
