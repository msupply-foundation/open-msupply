import { For, Show, type JSX } from 'solid-js';
import { localisedDate } from '../../../intl/formatDateTime';
import { t } from '../../../intl';
import { Popover } from './Popover';
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
 * Popover's, already bought).
 */
export const StatusIndicator = (props: StatusIndicatorProps): JSX.Element => {
  const showHistory = () => props.history !== false;

  // The status row itself — the whole thing is the popover trigger (below), so
  // this is what the user hovers. Rendered as an ordered list (the stages ARE
  // ordered). The strip carries the shared `status-crumbs` test hook
  // (e2e/TESTIDS.md) in both the plain and popover-wrapped branches.
  const row = (
    <ol class={styles.steps} data-testid="status-crumbs">
      <For each={props.steps}>
        {(step, index) => (
          <li
            class={styles.step}
            data-reached={index() < props.current ? '' : undefined}
            data-current={index() === props.current ? '' : undefined}
            aria-current={index() === props.current ? 'step' : undefined}
          >
            <span class={styles.label}>{step.label}</span>
          </li>
        )}
      </For>
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
        placement="top-start"
        trigger={row}
      >
        <div class={styles.history}>
          <p class={styles.historyTitle}>{t('label.order-history')}</p>
          <ol class={styles.timeline}>
            <For each={props.steps}>
              {(step, index) => (
                <li
                  class={styles.timelineStep}
                  data-reached={index() <= props.current ? '' : undefined}
                  data-current={index() === props.current ? '' : undefined}
                >
                  <span class={styles.dot} aria-hidden="true" />
                  <span class={styles.timelineLabel}>{step.label}</span>
                  <span class={styles.timelineDate}>
                    {step.date ? localisedDate(step.date) : ''}
                  </span>
                </li>
              )}
            </For>
          </ol>
        </div>
      </Popover>
    </Show>
  );
};

const statusClass = (extra?: string) =>
  extra ? `${styles.indicator} ${extra}` : styles.indicator;
