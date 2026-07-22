import { Show, type JSX } from 'solid-js';
import { ArrowRightIcon } from '../../icons';
import styles from './StatComparisonTile.module.css';

// A labelled tile presenting a value beside its adjusted/preview counterpart —
// the stock adjustment modal's "Available packs" / "Packs on hand" tiles
// (spec/stock S4, component registry "Stat comparison tile"). The preview
// (adjusted) side is blank until there is an input. Purely presentational: the
// caller supplies already-formatted strings and decides when `adjusted` is set.
// An optional sub-note under each value carries secondary context (e.g. the
// dose equivalent when managing vaccines in doses).

export interface StatComparisonTileProps {
  /** The tile's label (e.g. "Available packs"). */
  label: string;
  /** The current value, already formatted. */
  current: string;
  /** Secondary note under the current value (e.g. dose equivalent). */
  currentNote?: string;
  /**
   * The adjusted/preview value, already formatted. Omit (undefined) to leave
   * the preview side blank — the state before any input is entered.
   */
  adjusted?: string;
  /** Secondary note under the adjusted value. */
  adjustedNote?: string;
  testId?: string;
}

const Value = (props: {
  value: string;
  note?: string;
  muted?: boolean;
}): JSX.Element => (
  <span class={styles.side}>
    <span class={props.muted ? styles.valueMuted : styles.value}>
      {props.value}
    </span>
    <Show when={props.note}>
      <span class={styles.note}>{props.note}</span>
    </Show>
  </span>
);

export const StatComparisonTile = (
  props: StatComparisonTileProps
): JSX.Element => (
  <div class={styles.tile} data-testid={props.testId}>
    <span class={styles.label}>{props.label}</span>
    <div class={styles.values}>
      <Value value={props.current} note={props.currentNote} />
      <ArrowRightIcon class={styles.arrow} aria-hidden="true" />
      <Show
        when={props.adjusted !== undefined}
        fallback={<Value value="—" muted />}
      >
        <Value value={props.adjusted as string} note={props.adjustedNote} />
      </Show>
    </div>
  </div>
);
