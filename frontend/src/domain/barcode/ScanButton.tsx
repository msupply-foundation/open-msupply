// The scan affordances (spec/barcode-scanning ui-surface § R1), each a thin
// render over a ScanControl — every state they show is the control's.
//
// A screen places ONE control and the device decides its shape:
//  - a hardware scanner (always listening) renders the registry's SCAN STATUS
//    role (spec/ui-standards/components.md § Buttons & status): a status
//    badge that cannot be pressed, since the scanner's own trigger is the
//    whole of scanning. It is not an action, so it sits with the header's
//    other notes, never among the page-action buttons;
//  - a camera (one scan per press) renders a labelled Scan button, which is
//    a page action.
//
// So a screen renders both: <ScanButton> in its page actions and
// <ScanStatus> in its header's `alert` slot. Each renders nothing on the
// other kind of device.

import { Show } from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { Alert } from '@/ui/elements/feedback/Alert';
import { InfoTooltip } from '@/ui/elements/feedback/InfoTooltip';
import { ScanIcon } from '@/ui/icons';
import type { ScanControl } from './createScanControl';
import styles from './ScanButton.module.css';

/**
 * Why the scanner cannot be used, where the reason is the scanner's — a
 * scanner configured but not connected. Undefined otherwise: the screen's own
 * gate (saving, a dialog open, not editable) carries no reason here, because
 * that reason is already on screen (ui-surface § R1: "the screen's own
 * editability gate, not this vertical's").
 */
export const scanUnusableReason = (control: ScanControl): string | undefined =>
  control.disconnected()
    ? t('messages.scanner-not-connected-set-up')
    : undefined;

/**
 * The helper text a scanning field shows (ui-surface § The field scan
 * affordance): the unusable reason; else, on a hardware scanner that is
 * listening, that a scan fills the field — the only cue there is, since
 * no button is shown.
 */
export const scanFieldHelper = (control: ScanControl): string | undefined => {
  const reason = scanUnusableReason(control);
  if (reason !== undefined) return reason;
  return !control.needsPress() && control.listening()
    ? t('messages.scan-to-fill-barcode')
    : undefined;
};

/**
 * The camera's page action: one scan per press. Absent on a hardware
 * scanner (its status is <ScanStatus>, beside the header's notes) and where
 * the device has no scanner at all — hidden, not disabled (rules §
 * Triggering a scan).
 */
export const ScanButton = (props: { control: ScanControl }) => (
  <Show when={props.control.needsPress()}>
    <span class={styles.affordance}>
      <Button
        variant="secondary"
        icon={<ScanIcon />}
        disabled={props.control.inert()}
        loading={props.control.busy()}
        data-testid="scan-button"
        onClick={event => {
          // Drop focus, as the reference app does: a keyboard-emulation
          // scanner ends each read with Enter, which would re-press a
          // focused button.
          event.currentTarget.blur();
          void props.control.press();
        }}
      >
        {t('button.scan')}
      </Button>
      {/* A disabled button's own title is hover-only and unreachable by
          keyboard; the tooltip is focusable and opens on tap. */}
      <Show when={props.control.disconnected()}>
        <InfoTooltip text={t('messages.scanner-set-up-in-devices')} />
      </Show>
    </span>
  </Show>
);

/**
 * Whether <ScanStatus> has anything to say: a hardware scanner, on a screen
 * that can use a scan, that is listening or not connected.
 */
export const scanStatusShown = (control: ScanControl): boolean =>
  control.available() &&
  !control.needsPress() &&
  !control.screenDisabled() &&
  (control.disconnected() ||
    control.startError() !== undefined ||
    control.listening());

/**
 * The scan status (spec/ui-standards/components.md — "Scan status"): ready,
 * or not connected with where to set it up — and, as a separate note beside
 * it, a failure to start listening. Hardware only. A compact Alert —
 * the same persistent-context chip as a header's other notes, so a screen
 * passes it in its HeaderToolbar's `alert` slot; the Alert announces itself
 * when it appears or changes. Not a control, and not focusable.
 */
export const ScanStatus = (props: { control: ScanControl }) => (
  <>
    <Show
      when={
        scanStatusShown(props.control) &&
        (props.control.disconnected() || props.control.listening())
      }
    >
      <Alert
        severity={props.control.disconnected() ? 'warning' : 'success'}
        icon={ScanIcon}
        compact
        testId="scan-status"
      >
        {props.control.disconnected()
          ? t('messages.scanner-not-connected-set-up')
          : t('messages.scanner-ready')}
      </Alert>
    </Show>
    {/* Its own note, beside the status rather than instead of it. */}
    <Show when={scanStatusShown(props.control) && props.control.startError()}>
      {error => (
        <Alert severity="error" compact testId="scan-start-error">
          {error()}
        </Alert>
      )}
    </Show>
  </>
);

/**
 * The affordance beside a field (the stock line's Barcode): icon only, one
 * scan per press — camera only. With a hardware scanner the screen is already
 * listening, so nothing is rendered and the field's helper text
 * (`scanFieldHelper`) says a scan fills it. Pair with a `mode: 'field'`
 * control and pass it as the field's `endAction`.
 */
export const ScanFieldButton = (props: { control: ScanControl }) => (
  <Show when={props.control.needsPress()}>
    <IconButton
      icon={<ScanIcon />}
      label={t('button.scan')}
      size="small"
      disabled={props.control.inert()}
      aria-busy={props.control.busy() || undefined}
      data-testid="scan-field-button"
      onClick={() => void props.control.press()}
    />
  </Show>
);

/**
 * The control's latest failure, inline where the screen puts it — the
 * outcome of a scan belongs beside what took it, never in a toast
 * (spec/ui-standards/controls.md § Action feedback).
 */
export const ScanNotice = (props: { control: ScanControl }) => (
  <Show when={props.control.notice()}>
    {notice => (
      <Alert severity="error" testId="scan-notice">
        {notice()}
      </Alert>
    )}
  </Show>
);
