// The laser scanner built into Honeywell devices (the CK65), read through
// Honeywell's own SDK by the shell's HoneywellScanner plugin
// (android/app/src/shared/java/.../HoneywellScannerPlugin.java — compiled by
// BOTH Android shells, so the same plugin answers whichever one is running).
//
// The SDK hands over decoded TEXT, with the symbology it read — no keyboard
// layout or report framing in between — so this is a text source, like a
// camera, and it outranks every USB input in the preference order.
//
// The shell holds the scanner for as long as the app is in the foreground,
// whether or not anything is armed: that is what stops the device's own
// keyboard wedge typing a scan into whichever field has focus. So "armed"
// here decides only who a read is handed to. A read with nobody armed is
// dropped — the specified behaviour (spec/barcode-scanning/rules.md §
// Triggering a scan), and the same as every other source.
//
// Only the plugin's CURRENT surface (status/arm/trigger + events) is used. An
// APK older than it has the plugin but not those methods; status() rejects
// there and this source reads as not present. The plugin's legacy
// listen/release/available surface belongs to the old front end.

import { isAndroid } from '../index';
import { t } from '../../intl';
import {
  messageOf,
  type ListenResult,
  type RawScan,
  type ScanHandlers,
  type ScanOutcome,
  type ScanSource,
} from './source';

type HoneywellStatus = {
  apiVersion: number;
  available: boolean;
  claimed: boolean;
};

/** One read, as the plugin's "scan" event carries it. */
export type HoneywellScanEvent = {
  data: string;
  aimId?: string;
  codeId?: string;
};

type ListenerHandle = { remove: () => Promise<void> };

type HoneywellScannerPlugin = {
  status: () => Promise<HoneywellStatus>;
  arm: () => Promise<void>;
  trigger: (options: { on: boolean; timeoutMs?: number }) => Promise<void>;
  addListener(
    event: 'scan',
    handler: (scan: HoneywellScanEvent) => void
  ): Promise<ListenerHandle>;
  addListener(event: 'failure', handler: () => void): Promise<ListenerHandle>;
};

/**
 * How long a one-shot holds the beam on. The shell lets go by itself after
 * this; the extra second here is only a backstop for a "failure" event that
 * never arrives.
 */
const ONE_SHOT_TIMEOUT_MS = 5000;
const ONE_SHOT_BACKSTOP_MS = ONE_SHOT_TIMEOUT_MS + 1000;

let plugin: HoneywellScannerPlugin | undefined;
/** The plugin's events, subscribed once and kept for the session. */
let subscribed: Promise<void> | undefined;
/** The last word on whether the scanner can be used — read during render. */
let lastConnected = false;

/** Who a continuous read goes to. Unset = dropped. */
let armedHandlers: ScanHandlers | undefined;
/** A one-shot waiting on its read. Takes precedence over armedHandlers. */
let pendingOnce: ((outcome: ScanOutcome) => void) | undefined;
let backstop: ReturnType<typeof setTimeout> | undefined;

// Wrapped, never returned bare from an async function: resolving a promise
// with a value reads its `.then`, and the Capacitor proxy answers EVERY
// property with a native method — so `then` becomes a call to a native
// "then()" that rejects, and the outer promise never settles.
const getPlugin = async (): Promise<{ p: HoneywellScannerPlugin }> => {
  if (!plugin) {
    const { registerPlugin } = await import('@capacitor/core');
    plugin = registerPlugin<HoneywellScannerPlugin>('HoneywellScanner');
  }
  return { p: plugin };
};

/** Convert a plugin read to the layer's shape. Exported for tests. */
export const toRawScan = (scan: HoneywellScanEvent): RawScan => ({
  kind: 'text',
  text: scan.data,
  // The SDK reports an empty string when it has no identifier.
  ...(scan.aimId ? { aimId: scan.aimId } : {}),
});

/** Settle the pending one-shot, if there is one. */
const settleOnce = (outcome: ScanOutcome): void => {
  const resolve = pendingOnce;
  if (!resolve) return;
  pendingOnce = undefined;
  if (backstop !== undefined) clearTimeout(backstop);
  backstop = undefined;
  resolve(outcome);
};

const onScanEvent = (scan: HoneywellScanEvent): void => {
  const raw = toRawScan(scan);
  if (pendingOnce) {
    settleOnce({ ok: true, scan: raw });
    return;
  }
  armedHandlers?.onScan(raw);
};

// A no-read: almost always the trigger let go with nothing in the beam. That
// is routine while armed — the user simply tries again — so it is not
// reported as a failed reading. It only matters to a one-shot, which was
// waiting on exactly this press.
const onFailureEvent = (): void => {
  settleOnce({
    ok: false,
    cancelled: false,
    message: t('error.unable-to-read-barcode'),
  });
};

const subscribe = (p: HoneywellScannerPlugin): Promise<void> => {
  subscribed ??= Promise.all([
    p.addListener('scan', onScanEvent),
    p.addListener('failure', onFailureEvent),
  ]).then(
    () => undefined,
    e => {
      // Let the next arming try again rather than caching the failure.
      subscribed = undefined;
      throw e;
    }
  );
  return subscribed;
};

/** Claim (if another app took it) and make sure reads reach this module. */
const arm = async (): Promise<ListenResult> => {
  try {
    const { p } = await getPlugin();
    await subscribe(p);
    await p.arm();
    lastConnected = true;
    return { ok: true };
  } catch (e) {
    lastConnected = false;
    return { ok: false, message: messageOf(e) };
  }
};

export const honeywellSource: ScanSource = {
  id: 'honeywell',
  displayName: () => t('label.barcode-scanner-honeywell'),
  continuous: true,

  available: async () => {
    if (!isAndroid()) return false;
    try {
      // Waits out the SDK's startup on a Honeywell device; answers at once
      // everywhere else. Rejects on an APK that predates status().
      const status = await (await getPlugin()).p.status();
      lastConnected = status.available;
      return status.available;
    } catch {
      lastConnected = false;
      return false;
    }
  },
  connected: () => lastConnected,

  // Press the trigger from software and take the first read — for the
  // field-level scan button, which cannot ask the user to find the hardware
  // trigger. The hardware trigger works too while this is waiting.
  scanOnce: async () => {
    const armed = await arm();
    if (!armed.ok) {
      return {
        ok: false,
        cancelled: false,
        message: armed.message ?? t('error.unable-to-read-barcode'),
      };
    }
    // A second press supersedes the first rather than queueing behind it.
    settleOnce({ ok: false, cancelled: true });
    const outcome = new Promise<ScanOutcome>(resolve => {
      pendingOnce = resolve;
    });
    backstop = setTimeout(onFailureEvent, ONE_SHOT_BACKSTOP_MS);
    try {
      await (
        await getPlugin()
      ).p.trigger({
        on: true,
        timeoutMs: ONE_SHOT_TIMEOUT_MS,
      });
    } catch (e) {
      settleOnce({ ok: false, cancelled: false, message: messageOf(e) });
    }
    return outcome;
  },

  listen: async handlers => {
    const result = await arm();
    if (result.ok) armedHandlers = handlers;
    return result;
  },

  // Stops handing reads over; the shell keeps the claim (see top of file).
  release: async () => {
    armedHandlers = undefined;
    const hadOnce = pendingOnce !== undefined;
    settleOnce({ ok: false, cancelled: true });
    // Let go of a software trigger a one-shot left pressed.
    if (hadOnce && plugin) {
      await plugin.trigger({ on: false }).catch(() => undefined);
    }
  },
};

/** Forget all module state. Tests only. */
export const resetHoneywellForTest = (): void => {
  plugin = undefined;
  subscribed = undefined;
  lastConnected = false;
  armedHandlers = undefined;
  pendingOnce = undefined;
  if (backstop !== undefined) clearTimeout(backstop);
  backstop = undefined;
};
