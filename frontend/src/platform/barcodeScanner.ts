// Barcode scanning hardware — the capability wrapper (kdd/capacitor-plugins;
// spec/barcode-scanning). Everything above the seam sees only this module:
// which sources exist is not a question any screen may ask.
//
// It hands up RAW CHARACTERS. Reading the label — GS1 fields, item number,
// batch, expiry — is the next layer up (spec/barcode-scanning/rules.md §
// Reading a scan), and the registry that says what a code MEANS is above that
// again. A source knows nothing of any of it.
//
// Two things live here rather than in a source, because they are arbitration
// rather than hardware:
//
//  - ONE ACTIVE SOURCE. The sources are tried in a fixed order and the first
//    available one is driven. The reference app instead starts every source
//    at once and tears them all down together, so `isListening` means
//    "something, somewhere, might be armed".
//  - SCAN ROUTING. One owner at a time (see startListening).
//
// Never throws across the seam: every entry point returns a discriminated
// result.

import { createSignal } from 'solid-js';
import { manualSource } from './barcodeSources/manual';
import { honeywellSource } from './barcodeSources/honeywell';
import { cameraSource } from './barcodeSources/camera';
import { webHidSource } from './barcodeSources/webHid';
import { desktopHidSource } from './barcodeSources/desktopHid';
import { keyboardWedgeSource } from './barcodeSources/keyboardWedge';
import {
  messageOf,
  type RawScan,
  type ScanFailure,
  type ScanOutcome,
  type ScanSource,
  type ScanSourceId,
} from './barcodeSources/source';

export type {
  RawScan,
  ScanFailure,
  ScanOutcome,
  ScanSourceId,
} from './barcodeSources/source';

/**
 * Preference order. `manual` is first deliberately: it exists to stand in for
 * hardware while testing, so enabling it must override a real scanner that
 * happens to be attached (spec/settings/rules.md § Devices — barcode
 * scanner).
 *
 * Honeywell precedes camera because a device with a laser scanner should
 * never fall back to its camera — the reference app encodes the same
 * precedence by excluding the camera when Honeywell is present.
 *
 * The desktop app's native HID reader and WebHID read the same thing, and
 * never both at once — WebHID stands down in the desktop app
 * (./barcodeSources/webHid.ts § hid) — so their relative order only decides
 * which row is listed first.
 *
 * Reading a label's bytes directly beats reading its keystrokes, so the
 * keyboard wedge sits after every other real input: it is the only one that
 * can silently alter what the label said (./barcodeSources/wedgeDetect).
 *
 * The camera comes last: it is what a device scans with when it has nothing
 * else (spec/android/behaviours.md § Barcode scanning — "camera scanning is
 * used otherwise"). A USB scanner someone plugged in, or a keyboard wedge
 * they switched on, is a statement that they would rather use that.
 */
const DEFAULT_SOURCES: ScanSource[] = [
  manualSource,
  honeywellSource,
  desktopHidSource,
  webHidSource,
  keyboardWedgeSource,
  cameraSource,
];

let SOURCES: ScanSource[] = DEFAULT_SOURCES;

/**
 * Swap the source list, for tests that need a source which fails in a
 * specific way (a grant the browser will not open, say). Call with no
 * argument to restore. Not for app code — the list is fixed at runtime.
 */
export const setSourcesForTest = (sources: ScanSource[] = DEFAULT_SOURCES) => {
  SOURCES = sources;
};

const [active, setActive] = createSignal<ScanSource | undefined>(undefined);
const [availableIds, setAvailableIds] = createSignal<ScanSourceId[]>([]);
/** Every available source, in preference order — the fall-through list. */
let usable: ScanSource[] = [];

/**
 * Re-resolve which source is driving. Availability is asynchronous (a plugin
 * has to be asked), but the questions screens ask during render are not — so
 * the answer is cached in a signal and refreshed by explicit call.
 *
 * Call it after anything that could change what is attached: app start, and
 * the Devices settings toggles. A direct call rather than a watcher, per the
 * explicit-composition anti-default.
 */
export const refreshScanSources = async (): Promise<void> => {
  // Every source is asked, not just up to the first hit: the Devices screen
  // lists what this device can SEE (spec/settings/ui-surface.md § Devices —
  // "Available scanners"), which is a different question from which one is
  // driving. available() is a source's own capability check and must not be
  // able to take the whole resolution down with it.
  const candidates: ScanSource[] = [];
  for (const source of SOURCES) {
    if (await source.available().catch(() => false)) candidates.push(source);
  }
  usable = candidates;
  setAvailableIds(candidates.map(s => s.id));

  const next = candidates[0];
  if (next === active()) return;
  // Changing source invalidates any registration against the old one — its
  // handler would never fire again, so drop ownership rather than leave a
  // screen believing it is armed.
  await stopListening();
  setActive(next);
};

/**
 * Every input this device can see, in preference order — the Devices screen's
 * "Available scanners" row. Distinct from `activeSource()`, which is the one
 * actually driving.
 */
export const availableSources = (): ScanSourceId[] => availableIds();

/**
 * Every input the app knows how to drive, in preference order — including
 * the ones unavailable here. The Devices screen lists all of them, because
 * "Honeywell: not on this device" is a more useful answer than an empty list.
 */
export const allSourceIds = (): ScanSourceId[] => SOURCES.map(s => s.id);

/** Localised name for a source, for the Devices diagnostic screen only. */
export const sourceDisplayName = (id: ScanSourceId): string =>
  SOURCES.find(s => s.id === id)?.displayName() ?? id;

/** Is there a scanner on this device at all? False HIDES a scan affordance. */
export const scannerAvailable = (): boolean => active() !== undefined;

/**
 * Is the scanner usable right now? False with `scannerAvailable()` true means
 * shown-but-disabled with a reason — "Present but unusable beats absent"
 * (spec/barcode-scanning/rules.md § Triggering a scan).
 */
export const scannerConnected = (): boolean => active()?.connected() ?? false;

/** Can it stay armed, or is it one scan per press? */
export const supportsContinuousScanning = (): boolean =>
  active()?.continuous ?? false;

/**
 * Which input is driving. DIAGNOSTICS ONLY — the Devices screen may read it;
 * nothing in receiving, issuing or stock may branch on it
 * (spec/android/behaviours.md § Barcode scanning).
 */
export const activeSource = (): ScanSourceId | undefined => active()?.id;

// --- Scan routing: one owner at a time --------------------------------------
//
// spec/barcode-scanning/rules.md § Triggering a scan:
//   "One screen owns the scan at a time. Registering to receive scans
//    replaces whoever was registered before; a scan arriving with nobody
//    registered is dropped silently."
//   "Leaving a screen stops its scanning."
//
// Both halves are specified behaviour: the silent replacement and the silent
// drop are not gaps to be improved into a warning or a broadcast. The
// reference app honours the first and not the second — its callback is a bare
// ref with no way to unregister, so a screen that navigates away keeps
// receiving scans until something else happens to register.

/** Identifies a registration, so a stale disposer cannot release a live one. */
let ownerToken = 0;
/**
 * The token that holds the scan, as a signal so a handle's `owns()` is
 * reactive. `ownerToken` stays the synchronous source of truth; this mirrors
 * it wherever ownership actually changes hands.
 */
const [heldBy, setHeldBy] = createSignal(0);
const [ownerLabel, setOwnerLabel] = createSignal<string | undefined>(undefined);

/** Who holds the scan, for the Devices diagnostic screen. */
export const scanOwner = (): string | undefined => ownerLabel();

export type ListenHandle =
  | {
      ok: true;
      dispose: () => void;
      /**
       * Does this registration still hold the scan? Reactive. Turns false
       * when another screen takes over, when the driving source changes, or
       * on `dispose()` — so an armed control can stop reading as armed
       * without being told.
       */
      owns: () => boolean;
    }
  | { ok: false; message: string };

/**
 * Arm the scanner and take ownership of its scans, displacing any previous
 * owner. Call `dispose()` when the screen goes away.
 *
 * `dispose()` is inert once someone else has taken over, which is the point:
 * a naive `stopListening()` in an unmount cleanup would disarm whichever
 * screen had just replaced it — Solid runs the new screen's setup before the
 * old one's cleanup often enough for that to be a real race, and the symptom
 * (scanning silently dead on the screen you just opened) is miserable to
 * diagnose.
 *
 */
export const startListening = async (
  onScan: (scan: RawScan) => void,
  options: {
    /** Names the owner for the Devices diagnostic readout only. */
    label?: string;
    /**
     * A reading FAILED while armed — distinct from arming having failed.
     * Surfaced by the host screen as "The scanner could not produce a
     * reading" (spec/barcode-scanning/ui-surface.md § Notices).
     */
    onError?: (failure: ScanFailure) => void;
  } = {}
): Promise<ListenHandle> => {
  if (usable.length === 0) return { ok: false, message: 'no scanner available' };

  const token = ++ownerToken;
  // Claimed now, not once arming succeeds: the previous owner's scans are
  // dropped from this moment (the token gate below), so it must stop
  // reading as the owner from this moment too.
  setHeldBy(token);
  setOwnerLabel(options.label);

  // ARM EVERY AVAILABLE SOURCE, not just the preferred one.
  //
  // No source can tell whether it is the one the user is holding. A WebHID
  // grant survives the scanner being switched into keyboard-emulation mode:
  // the device still opens, arming still succeeds, and not one report ever
  // arrives — while the keyboard wedge that WOULD have read it sits behind
  // it in the preference order, never asked. Arming only the favourite
  // makes a silently-dead source shadow a working one indefinitely, and
  // nothing the user can do from the app dislodges it.
  //
  // So preference order decides who is listed first and who is credited
  // when nothing has scanned yet — never who gets to listen. Whichever
  // source actually produces a scan is the one driving, and says so.
  //
  // The exception is manual input, which exists to stand in for hardware
  // and so takes the scan to itself (source.ts § exclusive).
  //
  // Only sources that CAN stay armed are armed. A one-scan-per-press input
  // (the camera) has nothing to arm — screens reach it through scanOnce.
  const exclusive = usable.find(source => source.exclusive);
  const arming = exclusive
    ? [exclusive]
    : usable.filter(source => source.continuous);
  if (arming.length === 0) {
    // Same as nothing arming below: do not leave the token claimed.
    setOwnerLabel(undefined);
    return { ok: false, message: 'no scanner here can stay armed' };
  }

  const armed: ScanSource[] = [];
  const failures: string[] = [];

  for (const source of arming) {
    const result = await source
      .listen({
        // Gated on the token: anything a source reports after this
        // registration was displaced belongs to nobody, and is dropped
        // silently per the rule above.
        onScan: scan => {
          if (token !== ownerToken) return;
          // Whoever produced a scan is demonstrably the live one — the only
          // evidence that exists.
          setActive(source);
          onScan(scan);
        },
        onError: failure => {
          if (token !== ownerToken) return;
          options.onError?.(failure);
        },
      })
      .catch((e: unknown) => ({
        ok: false,
        message: messageOf(e),
      }));

    if (result.ok) armed.push(source);
    else {
      failures.push(`${source.id}: ${result.message ?? 'failed to start'}`);
      await source.release().catch(() => undefined);
    }
  }

  if (armed.length === 0) {
    // Nothing is listening — do not leave the token claimed, or a later
    // dispose() from a successful owner would be ignored.
    if (token === ownerToken) setOwnerLabel(undefined);
    return { ok: false, message: failures.join('; ') };
  }

  // Credit the first armed source until something actually scans.
  setActive(armed[0]);

  return {
    ok: true,
    dispose: () => {
      if (token !== ownerToken) return;
      void stopListening();
    },
    owns: () => heldBy() === token,
  };
};

/**
 * Disarm and give the hardware back, whoever owns it. Screens should prefer
 * the disposer from `startListening`; this is for the Devices screen's
 * explicit stop and for teardown.
 */
export const stopListening = async (): Promise<void> => {
  cancelPending?.();
  ownerToken += 1;
  setHeldBy(ownerToken);
  setOwnerLabel(undefined);
  await releaseActive();
};

// Every source is released, not just the one credited as active: several
// may be armed at once (see startListening), and a source left holding a
// device would keep it from the next screen — or from another application.
const releaseActive = async (): Promise<void> => {
  await Promise.all(
    usable.map(source => source.release().catch(() => undefined))
  );
};

/** Settles the one-shot in flight as cancelled, if there is one. */
let cancelPending: (() => void) | undefined;

/**
 * Ask for exactly one scan. Used by the field-level affordance, and by every
 * affordance on a source that cannot stay armed.
 *
 * Always cancellable: `cancelScanOnce()` (and `stopListening()`) settle it as
 * cancelled whatever the source does, so a caller is never left waiting on a
 * source that has no way to end its own wait.
 */
export const scanOnce = (): Promise<ScanOutcome> => {
  const source = active();
  if (!source) {
    return Promise.resolve({
      ok: false,
      cancelled: false,
      message: 'no scanner available',
    });
  }
  // A second ask supersedes the first rather than queueing behind it.
  cancelPending?.();
  return new Promise<ScanOutcome>(resolve => {
    let settled = false;
    const settle = (outcome: ScanOutcome) => {
      if (settled) return;
      settled = true;
      if (cancelPending === cancel) cancelPending = undefined;
      resolve(outcome);
    };
    const cancel = () => {
      settle({ ok: false, cancelled: true });
      // Give the hardware back: closes a camera, drops a one-shot listener.
      void source.release().catch(() => undefined);
    };
    cancelPending = cancel;
    // Called synchronously, so a source's own UI (the manual prompt) is up
    // by the time this returns.
    let pending: Promise<ScanOutcome>;
    try {
      pending = source.scanOnce();
    } catch (e) {
      settle({ ok: false, cancelled: false, message: messageOf(e) });
      return;
    }
    pending.then(settle, (e: unknown) =>
      settle({ ok: false, cancelled: false, message: messageOf(e) })
    );
  });
};

/** Cancel the one-shot scan in flight, if any — silently, as a cancel. */
export const cancelScanOnce = (): void => {
  cancelPending?.();
};
