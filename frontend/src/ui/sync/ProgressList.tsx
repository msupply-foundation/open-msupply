import {
  createEffect,
  createMemo,
  createSignal,
  Index,
  onCleanup,
  Show,
  type Component,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { AlertTriangleIcon, type IconProps } from '../icons';
import { Popover } from '../elements/feedback/Popover';
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
  /**
   * When the step started/finished — enables the per-step elapsed time: the
   * in-flight step's ticks against a live clock, a completed step's rides its
   * popover (omitted when its `finishedAt` never arrived — a step completed
   * by progression has no true end stamp).
   */
  startedAt?: string;
  finishedAt?: string;
  /**
   * Marker glyph, by intent (a push icon, a pull icon…). Empty circle when
   * omitted.
   */
  icon?: Component<IconProps>;
  /**
   * Locale-stable test hook for this step (`data-testid` on the row) — the
   * label is translated, so identifying one step needs an id of its own.
   */
  testId?: string;
  /**
   * The rail may jump to this step: its marker becomes a button calling
   * `onStepSelect`.
   */
  navigable?: boolean;
}

// Compact elapsed label, the current app's decomposition: exact seconds under
// a minute, "Xm Ys" under an hour, then "Xh 0Ym" — computed from milliseconds
// so a multi-day run folds into hours rather than being dropped.
const elapsedLabel = (startedAt: string, endMs: number): string => {
  const startMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return '';
  const totalSeconds = Math.floor(Math.max(0, endMs - startMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0)
    return t('label.elapsed-hours-minutes', {
      hours,
      minutes: String(minutes).padStart(2, '0'),
    });
  if (minutes > 0)
    return t('label.elapsed-minutes-seconds', { minutes, seconds });
  return t('label.elapsed-seconds', { seconds });
};

type StepState = 'completed' | 'active' | 'pending';

// Reads from the same derived state as the styling, so a step completed by
// progression (finished flag never arrived — the #12172 case) announces done,
// and the failure point announces error (the alert glyph is aria-hidden).
const stepStatus = (state: StepState, errored: boolean): string => {
  if (errored) return t('label.error');
  if (state === 'completed') return t('label.done');
  if (state === 'pending') return t('label.pending');
  return t('label.in-progress');
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
 * Display-only unless a consumer marks steps `navigable` and passes
 * `onStepSelect` — a wizard rail, whose markers are then buttons (the role's
 * second consumer family; ui/docs/ADDING_A_COMPONENT.md, closed
 * `WizardStepper`). The consumer owns which steps those are, so a gate it
 * holds is never restated here. A navigable step cannot ALSO carry the
 * completed-step popover — one marker, one button, and Popover owns its
 * trigger's click — so navigation wins and the figures move into the button's
 * accessible name; the overlap warns in dev rather than going quiet.
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
 * colour-alone: each step carries visually-hidden status text (pending / in
 * progress / done / error) derived from the SAME progression state as the
 * styling — the errored step's alert glyph and colour are only its visual
 * echo (the marker circle is aria-hidden).
 *
 * One count, on the in-flight step (D101): the done/total count — and the
 * step's elapsed time, ticking against a live clock — render beneath the
 * in-flight step only; a completed step's final count and duration are a
 * hover/focus popover on its marker (which becomes a button — both also ride
 * its accessible name, so the figures are never hover-only). Pending markers
 * stay plain spans. The step columns are equal-width regardless of content
 * (issue #971 — content-sized columns made the circles shift as digits grew).
 */
export const ProgressList = (props: {
  steps: ProgressStep[];
  variant?: 'primary' | 'secondary';
  /**
   * The latest run failed: the in-flight step is marked as the failure point.
   */
  error?: boolean;
  /** `data-testid` for the list element (locale-stable test hook). */
  testId?: string;
  /** Pressed a navigable step's marker — a wizard rail's move. */
  onStepSelect?: (index: number) => void;
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

  const stateOf = (index: number, step: ProgressStep): StepState => {
    if (index < furthest() || (index === furthest() && step.finished))
      return 'completed';
    if (index === furthest()) return 'active';
    return 'pending';
  };

  // Live clock for the in-flight step's elapsed time — ticking only while a
  // step is actually running and the run hasn't failed (on error the elapsed
  // freezes at the failure point, as the current app's does). Starts at a 0
  // sentinel — no elapsed shows until the clock's first tick: mounted AFTER
  // the failure (a reload), the failure moment is unknowable, and anchoring
  // to the mount time would show wall-time since the phase started instead of
  // how long it ran.
  const [now, setNow] = createSignal(0);
  const running = createMemo(() =>
    props.steps.some(step => step.started && !step.finished)
  );
  createEffect(() => {
    if (!running() || props.error === true) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    onCleanup(() => clearInterval(id));
  });

  return (
    <ol
      class={styles.list}
      data-variant={props.variant ?? 'primary'}
      data-testid={props.testId}
    >
      <Index each={props.steps}>
        {(step, index) => {
          const state = () => stateOf(index, step());
          const errored = () => props.error === true && state() === 'active';
          const count = () => {
            const { done, total } = step();
            return done != null && total != null
              ? t('label.sync-progress', { done, total })
              : '';
          };
          // The step's elapsed time: the in-flight step's runs against the
          // live clock (to its finish stamp once that arrives); a completed
          // step's is final, and omitted when its finish stamp never came —
          // progression-completed, so its true end is unknown. The in-flight
          // step's is also omitted while the clock holds its 0 sentinel (the
          // run failed before this mounted — see the clock above).
          const elapsed = () => {
            const { startedAt, finishedAt } = step();
            if (startedAt == null) return '';
            if (finishedAt != null)
              return elapsedLabel(startedAt, new Date(finishedAt).getTime());
            return state() === 'active' && now() > 0
              ? elapsedLabel(startedAt, now())
              : '';
          };
          // 0–1 fill for the in-flight marker's progress ring; unset when the
          // step isn't countable (the ring then stays the plain pale track).
          const ringProgress = () => {
            const { done, total } = step();
            return state() === 'active' &&
              done != null &&
              total != null &&
              total > 0
              ? Math.min(done / total, 1)
              : undefined;
          };
          const marker = () => (
            <span
              class={styles.circle}
              aria-hidden="true"
              style={
                ringProgress() != null
                  ? { '--ring-progress': String(ringProgress()) }
                  : undefined
              }
            >
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
          );
          const navigable = () =>
            step().navigable === true && props.onStepSelect !== undefined;
          // A completed step's own figures, as one phrase: the popover's
          // accessible name, and the tail of a navigable step's.
          const figures = () =>
            state() === 'completed' && (count() || elapsed());
          const figuresLabel = () =>
            count()
              ? elapsed()
                ? t('label.step-progress-elapsed', {
                    label: step().label,
                    // count() gates this arm: done/total are present.
                    done: step().done ?? 0,
                    total: step().total ?? 0,
                    elapsed: elapsed(),
                  })
                : t('label.step-progress', {
                    label: step().label,
                    done: step().done ?? 0,
                    total: step().total ?? 0,
                  })
              : t('label.step-elapsed', {
                  label: step().label,
                  elapsed: elapsed(),
                });

          /*
           * A navigable step's circle IS the button — and it cannot be a
           * popover's trigger as well: Popover owns that button's click, and in
           * hover mode the click is the ONLY way to open on touch, so the two
           * cannot share it. Navigation wins, because it is the interaction and
           * the figures are not; they ride the button's accessible name, which
           * is where the popover already put them so they were never
           * hover-only. The visible bubble is what a navigable step gives up,
           * which is why the warning below says so out loud.
           */
          const markerControl = () =>
            navigable() ? (
              <button
                type="button"
                class={styles.navButton}
                aria-label={t('label.go-to-step', {
                  label: figures() ? figuresLabel() : step().label,
                })}
                onClick={() => props.onStepSelect?.(index)}
              >
                {marker()}
              </button>
            ) : (
              marker()
            );

          // The role's two consumer families have not overlapped yet (a sync
          // run navigates nowhere, a wizard's steps carry no count). Say it
          // rather than let the next one find a rail that silently stopped
          // being clickable.
          if (import.meta.env.DEV)
            createEffect(() => {
              if (navigable() && figures())
                console.warn(
                  `ProgressList: step "${step().label}" is navigable AND carries a count or elapsed time. Its marker is the navigation button, so the hover bubble is dropped and the figures ride the button's accessible name instead.`
                );
            });
          return (
            <li
              class={styles.step}
              data-state={state()}
              data-error={errored() || undefined}
              aria-current={state() === 'active' ? 'step' : undefined}
              data-testid={step().testId}
            >
              <Show when={figures() && !navigable()} fallback={markerControl()}>
                <Popover
                  openOnHover
                  placement="bottom"
                  trigger={marker()}
                  triggerLabel={figuresLabel()}
                  triggerClass={styles.markerButton}
                  class={styles.countBubble}
                >
                  <Show when={count()}>
                    <p class={styles.countBubbleText}>{count()}</p>
                  </Show>
                  <Show when={elapsed()}>
                    <p class={styles.countBubbleText}>{elapsed()}</p>
                  </Show>
                </Popover>
              </Show>
              <span class={styles.label}>{step().label}</span>
              <span class={styles.count}>
                {state() === 'active' ? count() : ''}
              </span>
              <span class={styles.elapsed}>
                {state() === 'active' ? elapsed() : ''}
              </span>
              <span class={styles.srOnly}>
                {stepStatus(state(), errored())}
              </span>
            </li>
          );
        }}
      </Index>
    </ol>
  );
};
