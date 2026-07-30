import { children, createUniqueId, Show, type JSX } from 'solid-js';
import styles from './ToggleSwitch.module.css';

export interface ToggleSwitchProps {
  /** The visible label; clicking it toggles (native <label> wrap). */
  label: string;
  checked?: boolean;
  /** Reports the new on/off state. */
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  /**
   * Tone of the "on" state: 'default' (action blue) or 'caution' (brand
   * orange), for a setting to be careful with (e.g. "on hold"). Off is always
   * neutral grey — state is never conveyed by colour alone (the thumb moves).
   */
  variant?: 'default' | 'caution';
  /**
   * An affordance rendered inline after the label text — the InfoTooltip help
   * icon whose bubble explains the setting. Rendered as a SIBLING of the
   * <label> rather than inside it: nested, its own accessible name would leak
   * into the switch's, and its click would land on the label and flip the
   * switch. With one present the root becomes that wrapping row (and carries
   * `class`); without one the DOM is unchanged. As TextField.
   */
  labelInfo?: JSX.Element;
  id?: string;
  class?: string;
  /** Test id on the native input (cross-FE test-id contract). */
  testId?: string;
}

/*
 * ToggleSwitch — a labelled on/off toggle on the native <input type="checkbox">
 * (named to avoid clashing with SolidJS's <Switch> control-flow component) with
 * `role="switch"` (NO library): a checkbox IS a switch to assistive tech once
 * role + the on/off state are set, and the native control gives keyboard
 * (Space) + `disabled` for free. The input is visually hidden (kept for a11y +
 * as the state owner); a styled track + sliding thumb sit beside the label,
 * driven off the input's :checked / :focus-visible via sibling selectors. The
 * state is the thumb position (never colour alone). Label typography matches
 * TextField / Checkbox.
 */
export const ToggleSwitch = (props: ToggleSwitchProps) => {
  const autoId = createUniqueId();
  const inputId = () => props.id ?? autoId;

  // The <label> that wraps the switch + its text. A local component so it
  // renders fresh in either branch (bare, or beside labelInfo) — reusing one
  // JSX node across both would try to mount it in two places. As TextField.
  // `class` stays on whichever element is the root, so a caller's layout class
  // always lands on the outermost box.
  // Resolved once — a JSX prop read twice builds two element trees
  // (kdd/solid-reactivity-pitfalls §3).
  const labelInfo = children(() => props.labelInfo);
  const Label = () => (
    <label
      class={
        props.class && !labelInfo()
          ? `${styles.root} ${props.class}`
          : styles.root
      }
      data-disabled={props.disabled ? '' : undefined}
      data-variant={props.variant ?? 'default'}
    >
      <input
        id={inputId()}
        type="checkbox"
        role="switch"
        class={styles.input}
        checked={props.checked}
        disabled={props.disabled}
        data-testid={props.testId}
        onChange={event => props.onChange?.(event.currentTarget.checked)}
      />
      <span class={styles.track} aria-hidden="true">
        <span class={styles.thumb} />
      </span>
      <span class={styles.label}>{props.label}</span>
    </label>
  );

  return (
    <Show when={labelInfo()} fallback={<Label />}>
      <span
        class={
          props.class ? `${styles.labelRow} ${props.class}` : styles.labelRow
        }
      >
        <Label />
        {labelInfo()}
      </span>
    </Show>
  );
};
