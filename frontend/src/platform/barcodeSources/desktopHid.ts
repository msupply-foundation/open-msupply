// A USB scanner in HID (report) mode, read natively by the desktop app's
// shell through node-hid — the old Electron shell until the new one replaces
// it (client/packages/electron/src/hidScanner).
//
// The native counterpart ./webHid.ts anticipates, and a source in its own
// right for the reasons given there: it shares the byte decoding
// (src/domain/barcode/hidReport.ts) and nothing else. It exists because
// WebHID is a poor fit inside that shell — with no chooser handler Electron
// hands the page the first HID device it finds, and the grant does not
// survive a restart — so in the desktop app this source reads the scanner
// and WebHID stands down (./webHid.ts § hid).
//
// Pairing is the shell's: scan the pairing barcode with the scanner, or pick
// it from a list. The pairing is remembered by the shell, on this device.
//
// A shell too old to expose the bridge simply has no such source. Its own
// older scanner bridge (electronNativeAPI.startBarcodeScan) is not used: it
// pairs by matching one scanner's report framing, which the scanners this
// app was captured against do not use.

import { createSignal } from 'solid-js';
import { t } from '../../intl';
import {
  messageOf,
  type ListenResult,
  type ScanHandlers,
  type ScanOutcome,
  type ScanSource,
} from './source';

// The shell's side of the bridge — client/packages/electron/src/preload.ts
// § desktopHidScanner, which must agree with this.

export type DesktopHidScanner = {
  vendorId: number;
  productId: number;
  interface?: number;
  usagePage?: number;
  usage?: number;
  name: string;
};

export type DesktopHidStatus = {
  paired: DesktopHidScanner | null;
  connected: boolean;
};

export type DesktopHidCandidate = DesktopHidScanner & {
  key: string;
  /** Advertises the bar-code scanner usage page. */
  scannerUsage: boolean;
};

export type DesktopHidPairResult =
  | { ok: true; scanner: DesktopHidScanner }
  | { ok: false; reason: 'timeout' | 'cancelled' | 'no-devices' | 'not-found' };

type DesktopHidBridge = {
  version: number;
  status: () => Promise<DesktopHidStatus>;
  candidates: () => Promise<DesktopHidCandidate[]>;
  pair: () => Promise<DesktopHidPairResult>;
  pairDevice: (key: string) => Promise<DesktopHidPairResult>;
  cancelPair: () => Promise<void>;
  forget: () => Promise<void>;
  start: () => Promise<{ ok: true } | { ok: false; message: string }>;
  stop: () => Promise<void>;
  onReport: (callback: (bytes: Uint8Array) => void) => void;
  onChange: (callback: () => void) => void;
};

declare global {
  interface Window {
    desktopHidScanner?: DesktopHidBridge;
  }
}

/** The bridge version this front end speaks. */
const BRIDGE_VERSION = 1;

const bridge = (): DesktopHidBridge | undefined => {
  if (typeof window === 'undefined') return undefined;
  const api = window.desktopHidScanner;
  return api?.version === BRIDGE_VERSION ? api : undefined;
};

/** Is this the desktop app, with a shell that can read a HID scanner? */
export const desktopHidSupported = (): boolean => bridge() !== undefined;

const NOT_PAIRED: DesktopHidStatus = { paired: null, connected: false };

// A signal, so a scanner pulled out re-renders whatever reads `connected()`
// — the scan affordance's disabled state included.
const [status, setStatus] = createSignal<DesktopHidStatus>(NOT_PAIRED);

/** The last status the shell gave, for the Devices screen. Reactive. */
export const desktopHidStatus = status;

const readStatus = async (): Promise<DesktopHidStatus> => {
  const next = (await bridge()?.status().catch(() => undefined)) ?? NOT_PAIRED;
  setStatus(next);
  return next;
};

// --- Pairing, for the Devices screen ---------------------------------------

/** Wait for the pairing barcode, and pair whichever device scans it. */
export const pairDesktopHidByScan = async (): Promise<DesktopHidPairResult> => {
  const api = bridge();
  if (!api) return { ok: false, reason: 'no-devices' };
  const result = await api
    .pair()
    .catch((): DesktopHidPairResult => ({ ok: false, reason: 'no-devices' }));
  await readStatus();
  return result;
};

export const cancelDesktopHidPair = async (): Promise<void> => {
  await bridge()?.cancelPair().catch(() => undefined);
};

/** The attached devices that could be the scanner, likeliest first. */
export const desktopHidCandidates = async (): Promise<DesktopHidCandidate[]> =>
  (await bridge()?.candidates().catch(() => [])) ?? [];

export const pairDesktopHidDevice = async (
  key: string
): Promise<DesktopHidPairResult> => {
  const api = bridge();
  if (!api) return { ok: false, reason: 'not-found' };
  const result = await api
    .pairDevice(key)
    .catch((): DesktopHidPairResult => ({ ok: false, reason: 'not-found' }));
  await readStatus();
  return result;
};

export const forgetDesktopHid = async (): Promise<void> => {
  await bridge()?.forget().catch(() => undefined);
  await readStatus();
};

/**
 * Re-ask whenever the shell says something changed: pairing, forgetting, or
 * the scanner going away while armed. Wired at the composition root
 * (src/index.tsx), one-way, like ./webHid.ts § watchHidDevices.
 *
 * The shell does not watch for a scanner being plugged back in (it would
 * have to poll), so that is picked up the next time a screen arms.
 */
export const watchDesktopHid = (onChange: () => void): void => {
  bridge()?.onChange(() => {
    void readStatus().then(onChange);
  });
};

// --- The transport ---------------------------------------------------------

/** Who armed us. Reports arriving with nobody here are dropped. */
let handlers: ScanHandlers | undefined;

export const desktopHidSource: ScanSource = {
  id: 'desktop-hid',
  displayName: () => t('label.barcode-scanner-desktop-hid'),
  continuous: true,

  // Paired is enough to be listed and shown — a paired scanner that is not
  // plugged in is "present but unusable", which is shown disabled with a
  // reason rather than hidden (spec/barcode-scanning/rules.md § Triggering
  // a scan).
  available: async () => desktopHidSupported() && (await readStatus()).paired !== null,
  connected: () => status().connected,

  // Always streaming, so a one-shot is just the next report — the same
  // shape as ./webHid.ts.
  scanOnce: () =>
    new Promise<ScanOutcome>(resolve => {
      void desktopHidSource
        .listen({
          onScan: scan => {
            void desktopHidSource.release();
            resolve({ ok: true, scan });
          },
        })
        .then(result => {
          if (!result.ok) {
            resolve({
              ok: false,
              cancelled: false,
              message: result.message ?? t('error.unable-to-read-barcode'),
            });
          }
        });
    }),

  listen: async (next: ScanHandlers): Promise<ListenResult> => {
    const api = bridge();
    if (!api) return { ok: false, message: 'not the desktop app' };
    await desktopHidSource.release();

    // Registered before starting, so no report can slip between the two.
    // Handed up undecoded — the reading layer owns the framing.
    api.onReport(bytes => handlers?.onScan({ kind: 'bytes', bytes: new Uint8Array(bytes) }));
    const result = await api
      .start()
      .catch((e: unknown) => ({
        ok: false as const,
        message: messageOf(e),
      }));
    if (!result.ok) {
      // Most likely unplugged: say so, so the affordance stops claiming it.
      await readStatus();
      return { ok: false, message: result.message };
    }
    handlers = next;
    setStatus(current => ({ ...current, connected: true }));
    return { ok: true };
  },

  release: async (): Promise<void> => {
    handlers = undefined;
    await bridge()?.stop().catch(() => undefined);
  },
};

/** For tests only: forget the cached status and any armed handlers. */
export const resetDesktopHidForTest = (): void => {
  handlers = undefined;
  setStatus(NOT_PAIRED);
};
