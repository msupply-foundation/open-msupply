import { createEffect, createSignal, on, onCleanup, Show } from 'solid-js';
import { Alert } from '../../elements/feedback/Alert';
import styles from './ContentFooterMessage.module.css';

/**
 * How long a non-persistent message stays before clearing itself. Longer than
 * the shared FLASH_MS (2s), which is sized for a label on the control the user
 * is looking at ("Copied"): this chip is read away from where the user
 * clicked, and has to survive the glance back from the closing dialog.
 */
export const MESSAGE_FLASH_MS = 5000;

/** One outcome for the footer to report. */
export interface FooterMessage {
  /** Drives the chip's colour and glyph: green for success, red for error. */
  type: 'success' | 'error';
  /**
   * The words — for a success, the current app's save confirmation for the
   * record ("Shipment saved 🥳", "Saved"); for an error, the refusal.
   */
  text: string;
  /**
   * Stay until the caller replaces or clears it, instead of clearing itself
   * after MESSAGE_FLASH_MS. For the non-success states, which the user must
   * read before acting again (a refused advance stays until the next attempt).
   */
  persistent?: boolean;
}

export interface ContentFooterMessageProps {
  /**
   * The outcome to show, or undefined for none. Each NEW object is a new
   * report — set a fresh one per outcome, so a second identical "Saved" still
   * shows. A non-persistent one clears itself; the caller need not.
   */
  message?: FooterMessage;
}

/*
 * The content footer's message slot — where a status footer reports the
 * outcome of its own action (spec/ui-standards/controls.md § action feedback).
 * The footer is the surface the action started from, and it outlives the
 * change: the status button is often hidden by the very status it just set,
 * so a report on the button would be destroyed by its own success, while this
 * slot sits where the user was looking and survives. Not a toast — it is part
 * of the bar the user clicked in, and it goes nowhere else.
 *
 * Place it after the bar's start content and before ContentFooterActions (the
 * inbound-shipment footer is the reference: Hold → crumbs → pager → slot →
 * actions). What it shows sits at the slot's inline END, beside the actions:
 * the chip lands where the status button was, often in the space the button
 * has just vacated.
 *
 * It is ALWAYS mounted, empty at rest, for two reasons: it is the bar's one
 * flexible item, so the free space it holds is already taken before
 * a chip lands in it (nothing moves when one does), and it is a polite live
 * region, which a screen reader only follows if it exists before its content
 * changes. A success chip drops its own alert role for that reason — the
 * slot announces it. An error keeps `role="alert"`, as the refusal notice it
 * replaced had, so it is announced at once.
 *
 * ONE chip for every outcome: the compact Alert, held to one line, its colour
 * set by the message's type. A refusal reads the same size as a success, so
 * neither ever grows the bar; hovering a truncated chip shows its whole text.
 *
 * When a success lands, the WHOLE bar answers it (ContentFooter's
 * `data-outcome` rule): one green wave travels along it. The chip alone is
 * small and sits still, and the bar is where the user's eye goes back to after
 * the dialog closes.
 *
 * The footer owns the words (which differ per vertical and per outcome) and
 * when to report; this owns how the report looks, how long it stays, and how it
 * comes and goes, so every footer's chip reads and behaves the same.
 */
export const ContentFooterMessage = (props: ContentFooterMessageProps) => {
  // The chip on screen. It outlives the report by its exit animation: when the
  // report ends — its time is up, or the caller cleared it — the chip is
  // marked leaving and sinks out, and only then is it removed. A new report
  // replaces it at once, mid-exit or not.
  const [shown, setShown] = createSignal<FooterMessage>();
  const [leaving, setLeaving] = createSignal(false);

  // The self-clear of a non-persistent report. Superseded by any new report
  // and cancelled on unmount, so it never fires at a chip it did not start.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stopTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  onCleanup(stopTimer);

  createEffect(
    on(
      () => props.message,
      next => {
        stopTimer();
        if (next) {
          setShown(next);
          setLeaving(false);
          if (!next.persistent)
            timer = setTimeout(() => {
              timer = undefined;
              setLeaving(true);
            }, MESSAGE_FLASH_MS);
        } else if (shown()) setLeaving(true);
      }
    )
  );

  return (
    <div
      class={styles.message}
      role="status"
      aria-live="polite"
      // What the slot is showing — ContentFooter reads it to run its wave
      // along the whole bar as a success lands.
      data-outcome={!leaving() ? shown()?.type : undefined}
    >
      {/* Keyed: every new report is a new chip, so its entry replays. */}
      <Show when={shown()} keyed>
        {message => (
          // Rises in, and sinks back out before it is removed. Both run on
          // --motion-base, which reduced motion zeroes: the chip then appears
          // and goes at once (animationend still fires).
          <span
            class={styles.flash}
            data-leaving={leaving() ? '' : undefined}
            title={message.text}
            onAnimationEnd={() => {
              if (!leaving()) return;
              setShown(undefined);
              setLeaving(false);
            }}
          >
            <Alert
              severity={message.type}
              compact
              truncate
              announce={message.type === 'error'}
              testId={
                message.type === 'error' ? 'status-error' : 'status-success'
              }
            >
              {message.text}
            </Alert>
          </span>
        )}
      </Show>
    </div>
  );
};
