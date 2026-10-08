// The scan affordance's behaviour, shared by both shapes of it
// (spec/barcode-scanning/rules.md § Triggering a scan; ui-surface.md § R1).
//
// A screen creates ONE of these, hands it the handler for what a scan means
// on that screen, and renders a <ScanButton> or <ScanFieldButton> over it.
// Everything between "a scanner fired" and "here is what the label says" is
// here: arming and disarming, one-off scans, reading the raw scan, the
// failure notices, and the Ctrl+S action. What a scan MEANS — looking the
// code up, filling fields in — is the screen's, and starts in `onScan`.
//
// It is also the Ctrl+S creation site (spec/keyboard KB-R2, ui/utils/
// shortcuts § CTRL_S): the binding is registered exactly where a scan
// control exists, and is inert wherever that control is absent or disabled.

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
import { createAction } from '@/ui/utils/keyActions';
import { CTRL_S } from '@/ui/utils/shortcuts';
import { readScan, type ReadScan } from './readScan';

export type ScanControlOptions = {
  /**
   * What a scan means here. Receives the scan already read — never an
   * unreadable one, which is reported as a notice instead (ui-surface §
   * Notices: "The scanner could not produce a reading").
   */
  onScan: (scan: Exclude<ReadScan, { kind: 'unreadable' }>) => void;
  /**
   * `'page'` (default) — the page-action button: arms the scanner where it
   * can stay armed, one scan per press where it cannot.
   * `'field'` — the affordance beside a field: always one scan per press,
   * never arms (ui-surface § The field scan affordance).
   */
  mode?: 'page' | 'field';
  /**
   * Page mode: arm on arrival, without being pressed, so the user can walk
   * up and scan. Default true; the equipment register opts out (ui-surface
   * § The page-action scan button).
   */
  armOnArrival?: boolean;
  /**
   * The screen's own editability gate. While true the control is disabled,
   * Ctrl+S is inert, and an armed scanner is disarmed.
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
   * A scanner exists but cannot be used right now — shown disabled with
   * `messages.scanner-not-connected-set-up` as the reason.
   */
  disconnected: Accessor<boolean>;
  /**
   * Field mode: another screen holds the armed scanner, so a one-off scan
   * here would compete with it. Disabled, same reason as disconnected.
   */
  armedElsewhere: Accessor<boolean>;
  /** The affordance is shown but cannot be pressed, for any reason. */
  inert: Accessor<boolean>;
  /** Armed, and still the screen receiving scans. Page mode only. */
  listening: Accessor<boolean>;
  /** Arming or a one-off scan is in flight. */
  busy: Accessor<boolean>;
  /** The current label: _Scan_, or _Ready to scan…_ while armed. */
  label: Accessor<string>;
  /**
   * The latest failure, localised, for the screen to show inline beside the
   * affordance (spec/ui-standards/controls.md § Action feedback — never a
   * toast). Cleared by the next press or the next good scan.
   */
  notice: Accessor<string | undefined>;
  dismissNotice: () => void;
  /** What a press — or Ctrl+S — does. */
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
  let disposed = false;
  let scanning = false;

  const available = () => scannerAvailable();
  const disconnected = () => available() && !scannerConnected();
  const listening = () => handle()?.owns() === true;
  const armedElsewhere = () => mode === 'field' && scanOwner() !== undefined;
  const inert = () =>
    !available() ||
    disconnected() ||
    armedElsewhere() ||
    screenDisabled() ||
    busy();
  const armable = () => mode === 'page' && supportsContinuousScanning();

  const deliver = (raw: RawScan) => {
    const read = readScan(raw);
    if (read.kind === 'unreadable') {
      setNotice(t('error.unable-to-read-barcode'));
      return;
    }
    setNotice(undefined);
    options.onScan(read);
  };

  const arm = async () => {
    setBusy(true);
    const result = await startListening(deliver, {
      label: options.owner,
      onError: () => setNotice(t('error.unable-to-read-barcode')),
    });
    setBusy(false);
    // The screen went away while arming: give the scanner straight back.
    if (disposed) {
      if (result.ok) result.dispose();
      return;
    }
    if (!result.ok) {
      setNotice(t('error.unable-to-start-scanning', { error: result.message }));
      return;
    }
    setHandle(result);
  };

  const disarm = () => {
    handle()?.dispose();
    setHandle(undefined);
  };

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
    if (inert()) return;
    setNotice(undefined);
    if (listening()) return disarm();
    if (armable()) return arm();
    return scanOne();
  };

  // Arm on arrival — once. Sources resolve asynchronously, so "arrival" is
  // the first moment the scanner is known to be armable, not mount. Once
  // tried it is never retried: a user who pressed stop meant it.
  let arrivalHandled = mode === 'field' || options.armOnArrival === false;
  createEffect(() => {
    if (arrivalHandled || !armable() || inert()) return;
    arrivalHandled = true;
    void arm();
  });

  // A screen that needs the scanner and finds it "not connected" asks again
  // rather than trusting the last answer: an input may not announce being
  // plugged back in (the desktop app's native scanner does not), so the
  // saved answer can be stale. A fresh answer that it is back arms through
  // the effect above.
  onMount(() => {
    if (disconnected()) void refreshScanSources();
  });

  // A screen that stops being editable stops scanning.
  createEffect(() => {
    if (screenDisabled() && listening()) disarm();
  });

  // "Leaving a screen stops its scanning." The disposer is inert once
  // another screen has taken over, so this cannot disarm its replacement. A
  // one-off scan still open is cancelled rather than left to land nowhere.
  onCleanup(() => {
    disposed = true;
    handle()?.dispose();
    if (scanning) cancelScanOnce();
  });

  const label = () =>
    listening() ? t('button.listening-for-scans') : t('button.scan');

  createAction({
    name: label,
    shortcut: CTRL_S,
    run: () => void press(),
    disabled: inert,
  });

  return {
    mode,
    available,
    disconnected,
    armedElsewhere,
    inert,
    listening,
    busy,
    label,
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
