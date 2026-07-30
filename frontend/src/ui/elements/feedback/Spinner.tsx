import { Show } from "solid-js";
import type { JSX } from 'solid-js';
import { t } from '../../../intl';
import styles from './Spinner.module.css';

export interface SpinnerProps {
  /**
   * Accessible label announced to screen readers (the spinner has role=status).
   * Defaults to "Loading…". Pass a more specific label where it helps.
   */
  label?: string;
  /**
   * Diameter, in rem. Default 2rem. The ring scales to this; stroke stays
   * proportional (0.15em). Sizing in rem keeps it scaling with the root font
   * size like the rest of the UI.
   */
  sizeRem?: number;
  /**
   * Centre the spinner in a block that fills its container (for a full-body
   * loading state — e.g. a Suspense fallback). Default false renders just the
   * inline ring.
   */
  center?: boolean;
  /** Test id on the outer element, for e2e (e.g. a table "loading" hook). */
  'data-testid'?: string;
}

/*
 * A standalone spinning-ring loading indicator — the general-purpose sibling of
 * the Button's in-flight spinner (same ring + keyframes idea, factored out).
 * Colour follows `currentColor`, size is a rem prop, and it carries
 * role=status + an accessible label so a screen reader announces the wait.
 * prefers-reduced-motion slows it rather than stopping (a stopped ring reads as
 * broken). Used centred in the DataTable's initial-load state.
 */
export const Spinner = (props: SpinnerProps): JSX.Element => {
  const ring = (
    <span
      class={styles.spinner}
      role="status"
      aria-label={props.label ?? t('loading')}
      style={{ 'font-size': `${props.sizeRem ?? 2}rem` }}
      data-testid={props.center ? undefined : props['data-testid']}
    />
  );
  return <Show when={props.center} fallback={ring}><div class={styles.center} data-testid={props['data-testid']}>
      {ring}
    </div></Show>;
};
