import { createEffect, createSignal, on, Show } from 'solid-js';
import { Alert } from '../../elements/feedback/Alert';
import styles from './ContentFooterMessage.module.css';

export interface ContentFooterMessageProps {
  /**
   * A success confirmation to show — the record's save confirmation
   * ("Shipment saved", "Saved"). The footer flashes it with createFlash, so it
   * clears itself; undefined shows nothing.
   */
  message?: string;
  /**
   * The id of the record the footer is showing. Some detail views keep their
   * footer mounted while the route swaps in another record, and a chip still
   * on screen then speaks for the record the user left — so a new id drops it
   * at once, with no exit.
   */
  recordId?: string;
}

/*
 * The content footer's message slot — where a status footer confirms that its
 * own action landed (spec/ui-standards/controls.md § action feedback). The
 * footer is the surface the action started from, and it outlives the change:
 * the status button is often hidden by the very status it just set, so a
 * report on the button would be destroyed by its own success, while this slot
 * sits where the user was looking and survives. Not a toast — it is part of
 * the bar the user clicked in, and it goes nowhere else.
 *
 * Successes only. A refusal is something the user must read and act on, so it
 * keeps the full-width error Alert (and its `role="alert"`) in the footer that
 * raised it; it is never shrunk into this chip.
 *
 * Place it after the bar's start content and before ContentFooterActions (the
 * inbound-shipment footer is the reference: Hold → crumbs → pager → slot →
 * actions). What it shows sits at the slot's inline END, beside the actions:
 * the chip lands where the status button was, often in the space the button
 * has just vacated.
 *
 * It is ALWAYS mounted, empty at rest, for two reasons: it is the bar's one
 * flexible item, so the free space it holds is already taken before a chip
 * lands in it (nothing moves when one does), and it is a polite live region,
 * which a screen reader only follows if it exists before its content changes.
 * The chip drops its own alert role for that reason: the slot announces it,
 * once.
 *
 * The footer owns the words (which differ per vertical) and the flash; this
 * owns how the chip looks and how it comes and goes, so every footer's chip
 * reads and behaves the same.
 */
export const ContentFooterMessage = (props: ContentFooterMessageProps) => {
  // The text on screen. It outlives `message` by the chip's exit: when the
  // flash clears, the chip is marked leaving and sinks out, and only then is
  // it removed. A new message replaces it at once, mid-exit or not.
  const [shown, setShown] = createSignal<string>();
  const [leaving, setLeaving] = createSignal(false);

  createEffect(
    on(
      () => props.message,
      next => {
        if (next !== undefined) {
          setShown(next);
          setLeaving(false);
        } else if (shown() !== undefined) setLeaving(true);
      }
    )
  );

  // Another record: drop the chip now. Deferred, so the id the footer mounts
  // with is not itself a change.
  createEffect(
    on(
      () => props.recordId,
      () => {
        setShown(undefined);
        setLeaving(false);
      },
      { defer: true }
    )
  );

  return (
    <div class={styles.message} role="status" aria-live="polite">
      {/* Keyed: a new text is a new chip, so its entry replays. */}
      <Show when={shown()} keyed>
        {text => (
          // Rises in, and sinks back out before it is removed. Both run on
          // --motion-base, which reduced motion zeroes: the chip then appears
          // and goes at once (animationend still fires). Only the carrier's
          // own animation counts.
          <span
            class={styles.flash}
            data-leaving={leaving() ? '' : undefined}
            onAnimationEnd={event => {
              if (event.target !== event.currentTarget || !leaving()) return;
              setShown(undefined);
              setLeaving(false);
            }}
          >
            <Alert
              severity="success"
              compact
              truncate
              announce={false}
              testId="status-success"
            >
              {text}
            </Alert>
          </span>
        )}
      </Show>
    </div>
  );
};
