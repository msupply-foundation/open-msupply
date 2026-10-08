// The two scan affordances (spec/barcode-scanning ui-surface § R1), each a
// thin render over a ScanControl — every state they show is the control's.
//
// Composed from the generic labelled-action and icon-only button roles: the
// registry has no scan role of its own (ui-surface § Registry gaps), which is
// why "armed" is carried by the label text rather than by the control.

import { Show } from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { Alert } from '@/ui/elements/feedback/Alert';
import { InfoTooltip } from '@/ui/elements/feedback/InfoTooltip';
import { ScanIcon } from '@/ui/icons';
import { CTRL_S } from '@/ui/utils/shortcuts';
import type { ScanControl } from './createScanControl';
import styles from './ScanButton.module.css';

/**
 * Why the affordance is shown but cannot be pressed, where the reason is the
 * scanner's. The screen's own editability gate carries no reason here — that
 * belongs to the screen (ui-surface § R1: "the screen's own editability gate,
 * not this vertical's").
 *
 * A field affordance sits inside its field's frame, where a second icon
 * would crowd it, so the field shows this as its helper text instead.
 */
export const scanUnusableReason = (control: ScanControl): string | undefined =>
  control.disconnected() || control.armedElsewhere()
    ? t('messages.scanner-not-connected-set-up')
    : undefined;

/**
 * The reason, pressable and focusable beside the disabled control — a
 * disabled button's own title is hover-only and unreachable by keyboard
 * (spec/ui-standards/controls.md: never rely on hover to reveal why).
 */
const Reason = (props: { control: ScanControl }) => (
  <Show when={scanUnusableReason(props.control)}>
    {reason => <InfoTooltip text={reason()} />}
  </Show>
);

/**
 * The page-action scan button. Absent where the device has no scanner at all
 * — hidden, not disabled (rules § Triggering a scan).
 */
export const ScanButton = (props: { control: ScanControl }) => (
  <Show when={props.control.available()}>
    <span class={styles.affordance}>
      <Button
        variant="secondary"
        icon={<ScanIcon />}
        shortcut={CTRL_S}
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
        {props.control.label()}
        <Show when={props.control.listening()}>
          <span class={styles.armed} aria-hidden="true" />
        </Show>
      </Button>
      <Reason control={props.control} />
    </span>
  </Show>
);

/**
 * The affordance beside a field (the stock line's Barcode): icon only, one
 * scan per press. Pair with a `mode: 'field'` control, pass it as the
 * field's `endAction`, and give the field `scanUnusableReason(control)` as
 * its helper text.
 */
export const ScanFieldButton = (props: { control: ScanControl }) => (
  <Show when={props.control.available()}>
    <IconButton
      icon={<ScanIcon />}
      label={t('button.scan')}
      size="small"
      shortcut={CTRL_S}
      disabled={props.control.inert()}
      aria-busy={props.control.busy() || undefined}
      data-testid="scan-field-button"
      onClick={() => void props.control.press()}
    />
  </Show>
);

/**
 * The control's latest failure, inline where the screen puts it — the
 * outcome of a scan the user started belongs beside what they pressed,
 * never in a toast (spec/ui-standards/controls.md § Action feedback).
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
