import { Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import styles from './SimpleDispensing.module.css';

/*
 * A numbered step (spec/prescriptions ui-surface S9): signposts, not a
 * wizard. User testing on the prototype found the one-screen counter hard to
 * start on, so its three parts carry a number. Nothing is locked by them, and
 * they look the same whatever has been done: the medicines and the list are
 * used together, so a "current step" would jump on every press.
 */
export const StepHeading = (props: {
  n: number;
  label: string;
  hint?: string;
  testId?: string;
  /**
   * A heading heads a section (the medicines, the list). Step 1 labels a
   * field in the header instead, so it is not one.
   */
  heading?: boolean;
}) => (
  <Dynamic component={props.heading ? 'h2' : 'div'} class={styles.stepHeading}>
    <span class={styles.stepNumber} aria-hidden="true">
      {props.n}
    </span>
    <span class={styles.stepLabel}>{props.label}</span>
    <Show when={props.hint}>
      <span class={styles.stepHint} data-testid={props.testId}>
        {props.hint}
      </span>
    </Show>
  </Dynamic>
);
