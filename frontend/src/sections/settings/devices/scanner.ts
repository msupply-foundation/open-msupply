// The Devices › Barcode scanner section's view of the hardware
// (spec/settings/rules.md § Devices — barcode scanner). Everything here is
// read from the DEVICE, never the server: this section has no GraphQL or REST
// surface (contract § Devices — barcode scanner), and nothing scanned is ever
// recorded server-side.
//
// A thin adapter over src/platform/barcodeScanner.ts, which owns the actual
// hardware. This module exists only to give the section its own vocabulary —
// pairing, forgetting, which camera engine — and to own the one thing that
// genuinely belongs to this screen: the manual-input toggle.
//
// The section is a DIAGNOSTIC surface. It does not decide which input a
// working screen accepts a scan from; that selection is automatic and owned
// by the platform wrapper (rules § Devices — barcode scanner, last bullet).

import { createSignal } from 'solid-js';
import { refreshScanSources } from '../../../platform/barcodeScanner';
import {
  forgetPairedDevices,
  grantedDeviceNames,
  pairWebHidDevice,
  webHidSupported,
} from '../../../platform/barcodeSources/webHid';
import {
  cancelDesktopHidPair,
  desktopHidCandidates,
  forgetDesktopHid,
  pairDesktopHidByScan,
  pairDesktopHidDevice,
  type DesktopHidCandidate,
} from '../../../platform/barcodeSources/desktopHid';
import {
  getCameraEngine,
  getKeyboardWedgeEnabled,
  getMockBarcodeScannerEnabled,
  setCameraEngine as persistCameraEngine,
  setKeyboardWedgeEnabled as persistKeyboardWedgeEnabled,
  setMockBarcodeScannerEnabled as persistMockScannerEnabled,
  type CameraEngine,
} from '../../../appData';

// A module-level signal so the toggle's state survives the Settings ↔
// Test-scanner navigation, and so both screens re-render off one truth.
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
  // Enabling manual input adds a source, which can change which one drives.
  // A direct call rather than a watcher, per the explicit-composition
  // anti-default — this is the only thing on this screen that changes what is
  // attached.
  void refreshScanSources();
};

// --- Keyboard-emulation scanner (spec/settings § Devices) -----------------
//
// Whether this device has a scanner that TYPES the barcode rather than
// sending data reports. It cannot be detected — a wedge scanner is
// indistinguishable from a keyboard — so the user asserts it, and that
// assertion is the source's availability.
//
// Kept in a signal for the same reason as the toggle above: two screens read
// it, and switching it changes which input drives.
const [keyboardWedgeEnabled, setKeyboardWedgeSignal] = createSignal(
  getKeyboardWedgeEnabled()
);
export { keyboardWedgeEnabled };

export const setKeyboardWedgeEnabled = (enabled: boolean): void => {
  setKeyboardWedgeSignal(enabled);
  try {
    persistKeyboardWedgeEnabled(enabled);
  } catch {
    /* ignore — the signal is the in-session truth */
  }
  void refreshScanSources();
};

// --- Camera engine ----------------------------------------------------------
//
// Which decoder the camera scans with: MLKit's model bundled in the APK, or
// Google Code Scanner (platform/barcodeSources/camera.ts). Offered so the two
// can be compared on real devices. The source re-reads it per scan, so no
// re-resolution is needed — it changes how the camera reads, not whether
// there is one.
const [cameraEngine, setCameraEngineSignal] = createSignal<CameraEngine>(
  getCameraEngine()
);
export { cameraEngine };

export const setCameraEngine = (engine: CameraEngine): void => {
  setCameraEngineSignal(engine);
  try {
    persistCameraEngine(engine);
  } catch {
    /* ignore — the signal is the in-session truth */
  }
};

// --- Pairing a HID scanner (WebHID) ---------------------------------------
//
// A page may only reach a HID device the user has picked from the browser's
// own chooser, so pairing is a button rather than anything automatic, and it
// MUST run from the click — the browser refuses a chooser raised any other
// way.
//
// The grant persists per origin, so this is a once-ever step: the paired
// device comes back from getDevices() on every later visit.
const [pairedScanners, setPairedScanners] = createSignal<string[]>([]);
export { pairedScanners };

export const refreshPairedScanners = async (): Promise<void> => {
  setPairedScanners(await grantedDeviceNames());
};

export type PairOutcome = 'paired' | 'dismissed' | 'failed';

/**
 * Raise the browser's device chooser.
 *
 * @param anyDevice drop the bar-code-scanner usage-page filter and list
 * every HID device. The filter is what keeps the chooser down to one entry
 * instead of fifteen, but a scanner that does not advertise the page would
 * otherwise be unreachable — so the wider list stays available as a fallback
 * rather than as the default.
 */
export const pairScanner = async (anyDevice = false): Promise<PairOutcome> => {
  const result = await pairWebHidDevice({ anyDevice });
  if (!result.ok) return 'failed';
  await refreshPairedScanners();
  await refreshScanSources();
  return result.paired ? 'paired' : 'dismissed';
};

export const hidSupported = webHidSupported;

/**
 * Drop every paired scanner.
 *
 * Reconfiguring a scanner's USB mode does not revoke the grant the browser
 * already holds, and a grant for a mode the browser will no longer open
 * cannot be repaired by pairing again on top of it. This is the way out.
 */
export const forgetScanners = async (): Promise<{
  ok: boolean;
  message?: string;
}> => {
  const result = await forgetPairedDevices();
  await refreshPairedScanners();
  await refreshScanSources();
  return result;
};

// --- Pairing a HID scanner (desktop app) ----------------------------------
//
// The shell reads the scanner natively (platform/barcodeSources/desktopHid.ts)
// and does the pairing: either whichever device sends the next scan, or one
// picked from the list of attached devices. Remembered by the shell, on this
// device. Each outcome re-resolves the sources, since pairing adds one and
// forgetting removes it.

export type NativePairOutcome =
  | 'paired'
  | 'cancelled'
  | 'timeout'
  | 'no-devices'
  | 'not-found';

export const pairScannerByScan = async (): Promise<NativePairOutcome> => {
  const result = await pairDesktopHidByScan();
  await refreshScanSources();
  return result.ok ? 'paired' : result.reason;
};

export const cancelScannerPairing = cancelDesktopHidPair;

export const scannerCandidates = desktopHidCandidates;
export type { DesktopHidCandidate };

export const pairScannerDevice = async (
  key: string
): Promise<NativePairOutcome> => {
  const result = await pairDesktopHidDevice(key);
  await refreshScanSources();
  return result.ok ? 'paired' : result.reason;
};

export const forgetNativeScanner = async (): Promise<void> => {
  await forgetDesktopHid();
  await refreshScanSources();
};
