// A screen's scanning, shared by every screen that scans
// (spec/barcode-scanning/rules.md § Triggering a scan; ui-surface.md § R1).
//
// A screen creates ONE of these, hands it the handler for what a scan means
// on that screen, and renders a <ScanButton> or <ScanFieldButton> over it.
// Everything between "a scanner fired" and "here is what the label says" is
// here: listening, the camera's one scan per press, reading the raw scan, and
// the failure notices. What a scan MEANS — looking the code up, filling fields
// in — is the screen's, and starts in `onScan`.
//
// The trigger model has two halves, decided by the device and nothing else:
//
//  - A HARDWARE scanner (one that can stay armed) is always listening while
//    the screen can use a scan. Nothing is pressed in the app: pressing the
//    scanner's own trigger is the whole of scanning. The affordance renders
//    as a status that cannot be pressed.
//  - A CAMERA takes one scan per press. The affordance is a Scan button.
//
// There is no keyboard shortcut (spec/barcode-scanning/rules.md § Triggering a
// scan: "There is no keyboard shortcut for scanning").

import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  type Accessor,
} from 'solid-js';
import {
  cancelScanOnce,
  refreshScanSources,
  scanOnce,
  scanOwner,
  scannerAvailable,
  scannerConnected,
  startListening,
  supportsContinuousScanning,
  type ListenHandle,
  type RawScan,
} from '@/platform/barcodeScanner';
import { t } from '@/intl';
import type { AlertSeverity } from '@/ui/elements/feedback/Alert';
import { readScan, type ReadScan } from './readScan';

export type ScanControlOptions = {
  /**
   * What a scan means here. Receives the scan already read — never an
   * unreadable one, which is reported as a notice instead (ui-surface §
   * Notices: "The scanner could not produce a reading").
   */
  onScan: (scan: Exclude<ReadScan, { kind: 'unreadable' }>) => void;
  /**
   * `'page'` (default) — the page-action status / camera Scan button.
   * `'field'` — the affordance beside a field (the stock line's Barcode):
   * rendered only for a camera; on hardware the screen listens and the
   * field's helper text carries the status (ui-surface § The field scan
   * affordance). Listening is the same in both modes.
   */
  mode?: 'page' | 'field';
  /**
   * The screen cannot use a scan right now (not editable, a dialog covers the
   * field, saving…). While true a hardware scanner stops listening and the
   * camera button is disabled; listening resumes when it clears (rules §
   * Triggering a scan: "A screen stops listening while it cannot use a
   * scan").
   */
  disabled?: Accessor<boolean>;
  /** Names this screen in the Devices diagnostic readout. */
  owner: string;
};

export type ScanControl = {
  mode: 'page' | 'field';
  /** A scanner exists on this device. False HIDES the affordance. */
  available: Accessor<boolean>;
  /**
   * The scanner is one scan per press (the camera): the affordance is a
   * button. False for every hardware scanner, which is always listening.
   * `supportsContinuousScanning()` is the platform's answer; this is it,
   * inverted, for hosts that must branch.
   */
  needsPress: Accessor<boolean>;
  /**
   * A scanner exists but cannot be used right now — shown with
   * `messages.scanner-not-connected-set-up`.
   */
  disconnected: Accessor<boolean>;
  /** The screen's own gate (`disabled`) is closed. */
  screenDisabled: Accessor<boolean>;
  /** The camera button is shown but cannot be pressed, for any reason. */
  inert: Accessor<boolean>;
  /** Listening, and still the screen receiving scans. Hardware only. */
  listening: Accessor<boolean>;
  /** Starting to listen, or a camera scan, is in flight. */
  busy: Accessor<boolean>;
  /**
   * Starting to listen failed, localised — part of the screen's scan status,
   * not a notice. Cleared once the screen tries again.
   */
  startError: Accessor<string | undefined>;
  /**
   * The latest failure, localised, for the screen to show inline beside the
   * affordance (spec/ui-standards/controls.md § Action feedback — never a
   * toast). Cleared by the next press or the next good scan.
   */
  notice: Accessor<string | undefined>;
  dismissNotice: () => void;
  /** A press of the camera's Scan button. Does nothing on hardware. */
  press: () => Promise<void>;
};

export const createScanControl = (options: ScanControlOptions): ScanControl => {
  const mode = options.mode ?? 'page';
  const screenDisabled = () => options.disabled?.() === true;

  const [handle, setHandle] = createSignal<
    Extract<ListenHandle, { ok: true }> | undefined
  >(undefined);
  const [busy, setBusy] = createSignal(false);
  const [notice, setNotice] = createSignal<string | undefined>(undefined);
  const [startError, setStartError] = createSignal<string | undefined>(
    undefined
  );
  let disposed = false;
  let scanning = false;

  const available = () => scannerAvailable();
  const needsPress = () => available() && !supportsContinuousScanning();
  const disconnected = () => available() && !scannerConnected();
  const listening = () => handle()?.owns() === true;
  const inert = () =>
    !available() || disconnected() || screenDisabled() || busy();

  const deliver = (raw: RawScan) => {
    const read = readScan(raw);
    if (read.kind === 'unreadable') {
      setNotice(t('error.unable-to-read-barcode'));
      return;
    }
    setNotice(undefined);
    options.onScan(read);
  };

  // Set when starting to listen failed, so the effect below does not retry
  // in a loop; cleared whenever the screen's wish to listen changes.
  const startFailed = () => startError() !== undefined;

  const listen = async () => {
    setBusy(true);
    const result = await startListening(deliver, {
      label: options.owner,
      onError: () => setNotice(t('error.unable-to-read-barcode')),
    });
    // The screen went away while starting: give the scanner straight back.
    if (disposed) {
      if (result.ok) result.dispose();
      return;
    }
    if (!result.ok) {
      setStartError(
        t('error.unable-to-start-scanning', { error: result.message })
      );
    } else {
      setHandle(result);
    }
    setBusy(false);
  };

  const stop = () => {
    handle()?.dispose();
    setHandle(undefined);
  };

  // --- Hardware: always listening while the screen can use a scan ----------
  //
  // "Arrival" is the first moment the scanner is known to be usable, not
  // mount: sources resolve asynchronously. A screen that lost the scan to
  // another takes it back once nobody holds it (rules § Triggering a scan:
  // "One screen owns the scan at a time").
  const wantListening = () =>
    available() && !needsPress() && !disconnected() && !screenDisabled();
  let wanted = false;
  createEffect(() => {
    const want = wantListening();
    const becameWanted = want && !wanted;
    if (want !== wanted) {
      wanted = want;
      setStartError(undefined);
    }
    if (!want) {
      if (handle() !== undefined) stop();
      return;
    }
    if (busy() || listening() || startFailed()) return;
    // Displace whoever holds it on arrival; afterwards only re-take a scan
    // nobody holds, so two live screens cannot fight over it.
    if (becameWanted || scanOwner() === undefined) void listen();
  });

  // A screen that needs the scanner and finds it "not connected" asks again
  // rather than trusting the last answer: an input may not announce being
  // plugged back in (the desktop app's native scanner does not), so the
  // saved answer can be stale. A fresh answer that it is back starts
  // listening through the effect above.
  onMount(() => {
    if (disconnected()) void refreshScanSources();
  });

  // --- Camera: one scan per press ------------------------------------------
  const scanOne = async () => {
    setBusy(true);
    scanning = true;
    const outcome = await scanOnce();
    scanning = false;
    if (disposed) return;
    setBusy(false);
    if (outcome.ok) return deliver(outcome.scan);
    // A scan the user cancelled is silent — cancelling is not a failure.
    if (outcome.cancelled) return;
    setNotice(t('error.unable-to-scan-barcode', { error: outcome.message }));
  };

  const press = async () => {
    // Hardware never scans once: its trigger is the whole of scanning, and a
    // one-shot on a streaming source would wait with no way to end it.
    if (!needsPress() || inert()) return;
    setNotice(undefined);
    return scanOne();
  };

  // "Leaving a screen stops its scanning." The disposer is inert once
  // another screen has taken over, so this cannot stop its replacement. A
  // camera scan still open is cancelled rather than left to land nowhere.
  onCleanup(() => {
    disposed = true;
    handle()?.dispose();
    if (scanning) cancelScanOnce();
  });

  return {
    mode,
    available,
    needsPress,
    disconnected,
    screenDisabled,
    inert,
    listening,
    busy,
    startError,
    notice,
    dismissNotice: () => setNotice(undefined),
    press,
  };
};

/** A notice as a screen shows it beside its scan action. */
export type ScanNoticeShown = { severity: AlertSeverity; text: string };

/**
 * The one notice a scanning screen shows beside its scan action: the
 * control's own failure first, as an error, else the screen's latest outcome
 * of what a scan meant there. Both are inline, never a toast
 * (spec/ui-standards/controls.md § Action feedback).
 */
export const shownScanNotice =
  (
    control: Pick<ScanControl, 'notice'>,
    screen: Accessor<ScanNoticeShown | undefined>
  ): Accessor<ScanNoticeShown | undefined> =>
  () => {
    const failure = control.notice();
    return failure !== undefined
      ? { severity: 'error', text: failure }
      : screen();
  };
