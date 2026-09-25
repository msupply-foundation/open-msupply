import { Show } from 'solid-js';
import { Alert } from '../../elements/feedback/Alert';
import { Popover } from '../../elements/feedback/Popover';
import { createFooterReport, type FooterMessage } from './footerReport';
import styles from './ContentFooterMessage.module.css';

export { MESSAGE_FLASH_MS, type FooterMessage } from './footerReport';

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
 * changes. Every chip drops its own alert role for that reason: the slot
 * announces it, once. An alert inside the region would be announced twice,
 * the second time assertively.
 *
 * ONE chip for every outcome: the compact Alert, held to one line, its colour
 * set by the message's type. A refusal reads the same size as a success, so
 * neither ever grows the bar. A refusal chip is also a button that opens its
 * whole text on hover, focus or tap (touch has no hover): it may be the only
 * explanation of why nothing happened, and in a crowded bar the ellipsis can
 * leave little more than its icon. A success needs no such reveal, since its
 * words are short, fixed and gone in seconds.
 *
 * When a success lands, the WHOLE bar answers it (ContentFooter's
 * `data-outcome` rule): one green wave travels along it. The chip alone is
 * small and sits still, and the bar is where the user's eye goes back to after
 * the dialog closes.
 *
 * The footer owns the words (which differ per vertical and per outcome) and
 * when to report; this owns how the report looks, how long it stays, and how it
 * comes and goes (the timing is createFooterReport's), so every footer's chip
 * reads and behaves the same.
 */
export const ContentFooterMessage = (props: ContentFooterMessageProps) => {
  const report = createFooterReport(() => props.message);

  const chip = (message: FooterMessage) => (
    <Alert
      severity={message.type}
      compact
      truncate
      announce={false}
      testId={message.type === 'error' ? 'status-error' : 'status-success'}
    >
      {message.text}
    </Alert>
  );

  return (
    <div
      class={styles.message}
      role="status"
      aria-live="polite"
      // What the slot is showing — ContentFooter reads it to run its wave
      // along the whole bar as a success lands; `data-replay` flips per report
      // so the wave restarts when one success replaces another.
      data-outcome={!report.leaving() ? report.shown()?.type : undefined}
      data-replay={report.replay() ? '' : undefined}
    >
      {/* Keyed: every new report is a new chip, so its entry replays. */}
      <Show when={report.shown()} keyed>
        {message => (
          // Rises in, and sinks back out before it is removed. Both run on
          // --motion-base, which reduced motion zeroes: the chip then appears
          // and goes at once (animationend still fires). Only the carrier's
          // own animation counts — a refusal's popover panel animates inside
          // it, and its animationend bubbles up here.
          <span
            class={styles.flash}
            data-leaving={report.leaving() ? '' : undefined}
            onAnimationEnd={event => {
              if (event.target === event.currentTarget) report.exited();
            }}
          >
            <Show when={message.type === 'error'} fallback={chip(message)}>
              <Popover
                openOnHover
                placement="top-end"
                triggerClass={styles.reveal}
                trigger={chip(message)}
              >
                {message.text}
              </Popover>
            </Show>
          </span>
        )}
      </Show>
    </div>
  );
};
