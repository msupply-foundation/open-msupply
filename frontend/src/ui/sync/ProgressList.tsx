import { createMemo, Index, Show, type Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { AlertTriangleIcon, type IconProps } from '../icons';
import { t } from '../../intl';
import styles from './ProgressList.module.css';

// One step of a multi-phase operation. `label` arrives pre-translated; the
// per-step status strings are resolved here (sync.status.* keys — the only
// consumer family is sync, per the registry role's origin).
export interface ProgressStep {
  label: string;
  started: boolean;
  finished: boolean;
  done?: number;
  total?: number;
  /** Marker glyph, by intent (a push icon, a pull icon…). Empty circle when omitted. */
  icon?: Component<IconProps>;
}

const stepStatus = (step: ProgressStep): string => {
  if (step.finished) return t('sync.status.done');
  if (!step.started) return t('sync.status.pending');
  return t('sync.status.in-progress');
};

/*
 * Determinate progress list (registry role) — rendered as the current app's
 * horizontal stepper: one circled icon marker per step joined by connector
 * lines, label and done/total count beneath. Hand-rolled: a list plus CSS —
 * no interaction contract to buy.
 *
 * `variant` picks the tone (primary = brand, the sync modal; secondary = the
 * initialisation screen) — semantic, never colour-named.
 *
 * Steps always run in order, so anything before the furthest-started step is
 * complete — even if its own `finished` timestamp never came back (e.g. a
 * push with nothing to send). Deriving completion from progression keeps the
 * completed styling consistent across every passed step (the current app's
 * fix for its issue #12172).
 *
 * Consumers feed fresh step objects on every status tick, so nothing here may
 * key on object identity: position-keyed <Index> updates the existing DOM in
 * place instead of remounting rows each tick (kdd/solid-reactivity-pitfalls,
 * No remounts on interaction).
 *
 * The in-flight step pulses and carries aria-current="step"; meaning is never
 * colour-alone (each step carries visually-hidden pending / in progress /
 * done text, and the errored step swaps its marker for an alert glyph).
 */
export const ProgressList = (props: {
  steps: ProgressStep[];
  variant?: 'primary' | 'secondary';
  /** The latest run failed: the in-flight step is marked as the failure point. */
  error?: boolean;
}) => {
  // The furthest-started step: everything before it is completed, whatever
  // its own finished flag says.
  const furthest = createMemo(() => {
    let index = -1;
    props.steps.forEach((step, i) => {
      if (step.started) index = i;
    });
    return index;
  });

  const stateOf = (index: number, step: ProgressStep) => {
    if (index < furthest() || (index === furthest() && step.finished))
      return 'completed';
    if (index === furthest()) return 'active';
    return 'pending';
  };

  return (
    <ol class={styles.list} data-variant={props.variant ?? 'primary'}>
      <Index each={props.steps}>
        {(step, index) => {
          const state = () => stateOf(index, step());
          const errored = () => props.error === true && state() === 'active';
          const count = () => {
            const { done, total } = step();
            return done != null && total != null
              ? t('sync.status.progress', { done, total })
              : '';
          };
          return (
            <li
              class={styles.step}
              data-state={state()}
              data-error={errored() || undefined}
              aria-current={state() === 'active' ? 'step' : undefined}
            >
              <span class={styles.circle} aria-hidden="true">
                <Show
                  when={!errored() && step().icon}
                  fallback={
                    <Show
                      when={errored()}
                      fallback={
                        // No icon: the marker shows the step's number (the
                        // current app's prepare step).
                        <span class={styles.number}>{index + 1}</span>
                      }
                    >
                      <AlertTriangleIcon />
                    </Show>
                  }
                >
                  {icon => <Dynamic component={icon()} />}
                </Show>
              </span>
              <span class={styles.label}>{step().label}</span>
              <span class={styles.count}>{count()}</span>
              <span class={styles.srOnly}>{stepStatus(step())}</span>
            </li>
          );
        }}
      </Index>
    </ol>
  );
};
