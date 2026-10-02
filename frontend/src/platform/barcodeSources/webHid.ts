// A USB scanner read through WebHID (navigator.hid), in the mode scanner
// manuals call HID POS (Zebra) or IBM Hand-held USB. The label's bytes
// arrive verbatim, with no keyboard-layout round trip to corrupt them.
//
// A SOURCE IN ITS OWN RIGHT, not a transport behind a shared "HID" source.
// A shell-provided native HID reader would read the same reports and share
// the byte decoding (./hidReport.ts), and nothing else: it is available on
// different platforms, paired a completely different way (scan a barcode
// rather than pick from the browser's chooser), fails differently, recovers
// differently, and has to present differently. Folding the two behind one
// source would buy a shared interface with one implementor — which this
// codebase rejects by name (kdd/capacitor-plugins Fork 3) — and would hide
// from the user which of two very different things they are configuring.
//
// WebHID needs no native module and no shell, so this covers a browser tab,
// Android, and any desktop shell that grants HID access. What it cannot do
// is find the scanner for you: a page may only reach a device the user has
// picked from the browser's own chooser, which is why pairing here is
// `requestDevice` behind a button rather than the reference app's
// scan-a-known-barcode-and-see-which-device-answers trick (that needs
// permission to open every device, which WebHID will never give).
//
// The grant PERSISTS per origin, so the chooser is a once-ever cost:
// getDevices() returns what has already been granted, on every later visit.

import { t } from '../../intl';
import { desktopHidSupported } from './desktopHid';
import {
  messageOf,
  type ListenResult,
  type ScanHandlers,
  type ScanOutcome,
  type ScanSource,
} from './source';

/**
 * The HID usage page for bar-code scanners (USB HID Point of Sale usage
 * tables). Filtering the chooser on it is what turns a list of every HID
 * device on the machine — keyboards, mice, dongles, a dock — into, usually,
 * one entry.
 */
const BARCODE_SCANNER_USAGE_PAGE = 0x8c;

// Minimal structural types. @types/dom does ship WebHID, but typing it here
// keeps the module honest about the handful of members actually used and
// avoids a lib-wide DOM type bump for one transport.
type HidInputReportEvent = Event & { data: DataView; reportId: number };
type HidCollection = { usagePage: number; usage: number };
type HidDevice = {
  productName: string;
  vendorId: number;
  productId: number;
  opened: boolean;
  collections?: HidCollection[];
  open: () => Promise<void>;
  close: () => Promise<void>;
  /** Newer Chromium only — revokes the grant. */
  forget?: () => Promise<void>;
  addEventListener: (type: 'inputreport', handler: (e: HidInputReportEvent) => void) => void;
  removeEventListener: (type: 'inputreport', handler: (e: HidInputReportEvent) => void) => void;
};
type HidApi = {
  getDevices: () => Promise<HidDevice[]>;
  requestDevice: (options: {
    filters: { usagePage?: number; vendorId?: number }[];
  }) => Promise<HidDevice[]>;
  addEventListener: (type: 'connect' | 'disconnect', handler: () => void) => void;
};

// Not in the desktop app, where the shell reads the scanner natively
// (./desktopHid.ts). Electron does expose navigator.hid, but without a
// chooser handler it hands over the first HID device it finds and forgets
// the grant on restart — and two sources reading one scanner would deliver
// every scan twice.
const hid = (): HidApi | undefined =>
  typeof navigator === 'undefined' || desktopHidSupported()
    ? undefined
    : (navigator as unknown as { hid?: HidApi }).hid;

export const webHidSupported = (): boolean => hid() !== undefined;

/** Devices the user has already granted this origin. */
const grantedDevices = async (): Promise<HidDevice[]> =>
  (await hid()?.getDevices().catch(() => [])) ?? [];

/** Names of the granted devices, for the Devices settings list. */
export const grantedDeviceNames = async (): Promise<string[]> =>
  (await grantedDevices()).map(
    device =>
      device.productName ||
      `${device.vendorId.toString(16)}:${device.productId.toString(16)}`
  );

/**
 * Ask the user to pick a scanner. MUST be called from a user gesture — the
 * browser refuses otherwise, which is why this is exported for a button to
 * call rather than being attempted during availability resolution.
 *
 * Filtered to the bar-code scanner usage page so the chooser shows the
 * scanner rather than every HID device attached. A scanner that does not
 * advertise the page (or is in keyboard mode, which Chromium blocks from
 * WebHID entirely) will not appear — the caller can retry unfiltered.
 */
export const pairWebHidDevice = async (
  options: { anyDevice?: boolean } = {}
): Promise<{ ok: true; paired: boolean } | { ok: false; message: string }> => {
  const api = hid();
  if (!api) return { ok: false, message: 'WebHID not supported' };
  try {
    const devices = await api.requestDevice({
      filters: options.anyDevice ? [] : [{ usagePage: BARCODE_SCANNER_USAGE_PAGE }],
    });
    // An empty list is the user dismissing the chooser — declined, not failed.
    return { ok: true, paired: devices.length > 0 };
  } catch (e) {
    return { ok: false, message: messageOf(e) };
  }
};

/**
 * Re-ask what is attached whenever a HID device is plugged in or pulled out.
 *
 * The reference implementation has no unplug detection at all, so its
 * "connected" is whatever was true at the last pairing — a scanner pulled
 * out still reads as connected until the app is restarted. Wired at the
 * composition root (src/index.tsx) by direct call rather than a subscriber
 * registry, and one-way: this module never reaches back into the wrapper
 * that owns source resolution.
 */
export const watchHidDevices = (onChange: () => void): void => {
  const api = hid();
  if (!api) return;
  const changed = () => {
    // A device that reappears deserves a fresh judgement: re-plugging, or
    // reconfiguring the scanner back, is exactly how someone recovers from
    // a refusal.
    unopenable.clear();
    onChange();
  };
  api.addEventListener('connect', changed);
  api.addEventListener('disconnect', changed);
};

/**
 * Revoke every grant this origin holds.
 *
 * The manual way out of a scanner reconfigured into a mode the browser will
 * not open: the grant outlives the mode it was given for, and pairing again
 * is the only thing that re-establishes one that matches. `forget()` is
 * newer-Chromium only; where it is missing the grant can only be cleared
 * through the browser's own site settings, so say so rather than silently
 * doing nothing.
 */
export const forgetPairedDevices = async (): Promise<{
  ok: boolean;
  message?: string;
}> => {
  const devices = await grantedDevices();
  unopenable.clear();
  const forgettable = devices.filter(d => typeof d.forget === 'function');
  if (devices.length > 0 && forgettable.length === 0) {
    return { ok: false, message: 'this browser cannot revoke HID access' };
  }
  await Promise.all(
    forgettable.map(d => d.forget?.().catch(() => undefined))
  );
  return { ok: true };
};

// --- The transport ---------------------------------------------------------

let device: HidDevice | undefined;
let onReport: ((e: HidInputReportEvent) => void) | undefined;
/** Whether the last availability check found a device we could use. */
let lastKnownUsable = false;

/**
 * A device the browser will not hand over is not a scanner we have.
 *
 * Reconfiguring a scanner's USB mode does not revoke the grant, so a device
 * the page may no longer open keeps coming back from getDevices(). Treating
 * that as "available" is what left the layer stuck: the source claimed the
 * top of the preference order and then failed to open on every attempt.
 *
 * Two signals, cheapest first. Chromium withholds the protected collections
 * of a device that has become a keyboard, so an empty collection list means
 * there is nothing here to read. And a device that has actually thrown on
 * open() is remembered as unusable until the device list changes — hotplug
 * re-runs resolution (watchHidDevices), so recovery needs no user action
 * beyond re-plugging.
 */
const unopenable = new Set<string>();

const deviceKey = (d: HidDevice) => `${d.vendorId}:${d.productId}`;

const isUsable = (d: HidDevice): boolean =>
  !unopenable.has(deviceKey(d)) && (d.collections?.length ?? 0) > 0;

const firstGranted = async (): Promise<HidDevice | undefined> => {
  const found = (await grantedDevices()).find(isUsable);
  lastKnownUsable = found !== undefined;
  return found;
};

export const webHidSource: ScanSource = {
  id: 'web-hid',
  displayName: () => t('label.barcode-scanner-web-hid'),
  continuous: true,

  available: async () => (await firstGranted()) !== undefined,
  connected: () => device !== undefined || lastKnownUsable,

  // Always streaming, so a one-shot is just the next report. The wrapper
  // only asks for one where `continuous` is false, so no current caller
  // reaches this.
  scanOnce: () =>
    new Promise<ScanOutcome>(resolve => {
      void webHidSource
        .listen({
          onScan: scan => {
            void webHidSource.release();
            resolve({ ok: true, scan });
          },
          onError: failure => {
            void webHidSource.release();
            resolve({ ok: false, cancelled: false, message: failure.message });
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

  listen: async (handlers: ScanHandlers): Promise<ListenResult> => {
    await webHidSource.release();
    const target = await firstGranted();
    if (!target) return { ok: false, message: 'no scanner paired' };

    try {
      if (!target.opened) await target.open();
    } catch (e) {
      // Remember the refusal, so this device stops claiming the top of the
      // preference order and another source gets a turn.
      unopenable.add(deviceKey(target));
      return { ok: false, message: messageOf(e) };
    }

    onReport = event => {
      // Through the VIEW's window, not the whole backing buffer: a DataView
      // may be a slice of something larger, and reading past it would feed
      // the decoder bytes the device never sent.
      const bytes = new Uint8Array(
        event.data.buffer,
        event.data.byteOffset,
        event.data.byteLength
      );
      // Handed over undecoded. What the framing is, and therefore which of
      // these bytes are the label, is not this transport's call — see the
      // reading layer (src/domain/barcode/scanText.ts). A report carrying no
      // printable byte at all is the scanner saying something other than
      // "here is a barcode" (a status or heartbeat frame): not an error, and
      // not a scan.
      if (bytes.some(b => b >= 0x20)) handlers.onScan({ kind: 'bytes', bytes });
    };
    target.addEventListener('inputreport', onReport);
    device = target;
    return { ok: true };
  },

  release: async (): Promise<void> => {
    if (onReport && device) device.removeEventListener('inputreport', onReport);
    onReport = undefined;
    // Closing hands the device back to the OS, so another app — or another
    // tab — can read it while this screen is not scanning. The GRANT
    // survives; only the open handle goes.
    await device?.close().catch(() => undefined);
    device = undefined;
  },
};
