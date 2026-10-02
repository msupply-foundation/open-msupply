import { Index, Show, type JSX } from 'solid-js';
import { localisedDate } from '../../../intl/formatDateTime';
import { t } from '../../../intl';
import { Popover } from './Popover';
import { createStatusArrival } from './statusArrival';
import styles from './StatusIndicator.module.css';

export interface StatusStep {
  /** The step label (already translated by the caller). */
  label: string;
  /**
   * When this step was reached, if it has been — shown in the history popover.
   */
  date?: string | Date | null;
}

export interface StatusIndicatorProps {
  /**
   * The ordered stages of the flow (e.g. New → Finalised), inline-start to
   * inline-end.
   */
  steps: StatusStep[];
  /**
   * Index of the current step — it reads as current (accent); earlier steps as
   * reached.
   */
  current: number;
  /**
   * The id of the record whose progression this is. A detail view can keep
   * its footer mounted while the route swaps in another record, and without
   * this the jump from one record's status to the other's would play the
   * arrival motion as if the status had just changed.
   */
  recordId?: string;
  /** Show the hover status-history popover. Default true. */
  history?: boolean;
  class?: string;
}

/*
 * StatusIndicator — a document's status progression as a row of
 * chevron-separated stages, the shared control across the app's detail views
 * (stocktake, shipments, requisitions…). Matches Open mSupply's footer status
 * breadcrumb: reached stages read in the normal body colour, the CURRENT stage
 * is the brand accent, and stages not yet reached are greyed. Hovering (or
 * focusing) the WHOLE indicator opens a popover with the status history — each
 * stage as a dot on a vertical timeline with the datetime it was reached (like
 * OMS). Meaning never rides on colour alone — position + label + the accent
 * weight carry it, and the popover spells out the timeline (AA).
 *
 * Read-only progression: the only interaction is the hover popover (the
 * Popover's, already bought). A stage the record moves onto while the strip is
 * on screen plays a one-shot arrival motion (below) — the crumb change is
 * otherwise easy to miss, since it sits still and away from where the user
 * clicked.
 */
export const StatusIndicator = (props: StatusIndicatorProps): JSX.Element => {
  const showHistory = () => props.history !== false;

  // The stage a status change has just moved the record onto plays a one-shot
  // arrival: a brand-tinted bloom behind its label, fading as the label's
  // colour carries it from not-yet-reached grey to the current accent. Cleared
  // when the animation ends, so no later render replays it.
  const arrival = createStatusArrival(
    () => props.current,
    () => props.recordId
  );

  // The status row itself — the whole thing is the popover trigger (below), so
  // this is what the user hovers. Rendered as an ordered list (the stages ARE
  // ordered). The strip carries the shared `status-crumbs` test hook
  // (e2e/TESTIDS.md) in both the plain and popover-wrapped branches.
  //
  // Position-keyed (<Index>), not reference-keyed: every caller rebuilds its
  // step objects whenever the record changes, and a reference-keyed list would
  // then rebuild every <li> — restarting an arrival motion mid-play. Keyed by
  // position, the same <li> updates in place.
  const row = (
    <ol class={styles.steps} data-testid="status-crumbs">
      <Index each={props.steps}>
        {(step, index) => (
          <li
            class={styles.step}
            data-reached={index < props.current ? '' : undefined}
            data-current={index === props.current ? '' : undefined}
            data-arrived={index === arrival.arrived() ? '' : undefined}
            aria-current={index === props.current ? 'step' : undefined}
            onAnimationEnd={() => {
              if (index === arrival.arrived()) arrival.clear();
            }}
          >
            <span class={styles.label}>{step().label}</span>
          </li>
        )}
      </Index>
    </ol>
  );

  return (
    <Show
      when={showHistory()}
      fallback={<div class={statusClass(props.class)}>{row}</div>}
    >
      <Popover
        openOnHover
        triggerLabel={t('label.order-history')}
        triggerClass={statusClass(props.class)}
        triggerTestId="status-crumbs"
        placement="top-start"
        trigger={row}
      >
        <div class={styles.history}>
          <p class={styles.historyTitle}>{t('label.order-history')}</p>
          <ol class={styles.timeline}>
            <Index each={props.steps}>
              {(step, index) => (
                <li
                  class={styles.timelineStep}
                  data-reached={index <= props.current ? '' : undefined}
                  data-current={index === props.current ? '' : undefined}
                >
                  <span class={styles.dot} aria-hidden="true" />
                  <span class={styles.timelineLabel}>{step().label}</span>
                  <span class={styles.timelineDate}>
                    <Show when={step().date}>
                      {date => localisedDate(date())}
                    </Show>
                  </span>
                </li>
              )}
            </Index>
          </ol>
        </div>
      </Popover>
    </Show>
  );
};

const statusClass = (extra?: string) =>
  extra ? `${styles.indicator} ${extra}` : styles.indicator;
