import { createUniqueId, For, Show, type JSX } from 'solid-js';
import styles from './RadioGroup.module.css';

export interface RadioOption {
  value: string;
  label: string;
  /** Optional muted second line under the label. */
  description?: string;
  disabled?: boolean;
  /**
   * `data-testid` for the radio input (locale-stable test hook,
   * e2e/TESTIDS.md).
   */
  testId?: string;
}

interface RadioGroupProps {
  /** Group label — a <legend> for the fieldset (visually a small heading). */
  label?: string;
  /**
   * An affordance rendered inline after the group label — the InfoTooltip help
   * icon whose bubble explains the group. It has to live INSIDE the <legend>
   * (a legend must be the fieldset's first child), so the fieldset is named by
   * an explicit `aria-labelledby` on the label text alone — otherwise the
   * icon's own name would be concatenated into the group's. As TextField.
   */
  labelInfo?: JSX.Element;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  /** Disable the whole group (every option). */
  disabled?: boolean;
  /** Lay the options out in a row instead of the default column. */
  orientation?: 'vertical' | 'horizontal';
  /**
   * Inline-start indent, in rem — to line the options up under a sibling
   * control's text (e.g. the include-all radios sitting beneath a Combobox
   * whose leading icon insets its text).
   */
  indentRem?: number;
  class?: string;
}

/*
 * Radio group — built on the plain browser <input type="radio"> (NO headless
 * library). A radio group is the "own the simple" case: a shared `name` gives
 * the browser single-select grouping, roving arrow-key focus, and the
 * radiogroup/radio ARIA for free — nothing to buy. We draw the control
 * ourselves (`appearance: none` — brand rim + dot with a transparent gap;
 * `accent-color` painted the gap white in both schemes, see the CSS module)
 * and lay out the label beside it; the <fieldset>/<legend> carry the group
 * semantics. Matches the current app's radios.
 */
export const RadioGroup = (props: RadioGroupProps): JSX.Element => {
  // One shared name per group instance so the native radios single-select
  // together.
  const name = createUniqueId();
  const labelId = `${name}-label`;
  return (
    <fieldset
      class={props.class ? `${styles.root} ${props.class}` : styles.root}
      // Name the group from the label TEXT, not the whole legend: with a
      // labelInfo present the legend also holds the tooltip's trigger button,
      // whose accessible name would otherwise be concatenated into this one.
      aria-labelledby={props.label ? labelId : undefined}
      style={
        props.indentRem
          ? { 'padding-inline-start': `${props.indentRem}rem` }
          : undefined
      }
    >
      <Show when={props.label}>
        <legend class={styles.groupLabel}>
          <span id={labelId}>{props.label}</span>
          {props.labelInfo}
        </legend>
      </Show>
      <div
        class={styles.items}
        data-orientation={props.orientation ?? 'vertical'}
      >
        <For each={props.options}>
          {option => (
            <label
              class={styles.item}
              data-disabled={props.disabled || option.disabled ? '' : undefined}
            >
              <input
                type="radio"
                class={styles.input}
                name={name}
                data-testid={option.testId}
                value={option.value}
                checked={props.value === option.value}
                disabled={props.disabled || option.disabled}
                onChange={() => props.onChange?.(option.value)}
              />
              <div class={styles.text}>
                <span class={styles.label}>{option.label}</span>
                <Show when={option.description}>
                  <span class={styles.description}>{option.description}</span>
                </Show>
              </div>
            </label>
          )}
        </For>
      </div>
    </fieldset>
  );
};
