import { createUniqueId } from 'solid-js';
import styles from './Switch.module.css';

export interface SwitchProps {
  /** The visible label; clicking it toggles (native <label> wrap). */
  label: string;
  checked?: boolean;
  /** Reports the new on/off state. */
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  class?: string;
  /** Test id on the native input (cross-FE test-id contract). */
  testId?: string;
}

/*
 * Switch — a labelled on/off toggle on the native <input type="checkbox"> with
 * `role="switch"` (NO library): a checkbox IS a switch to assistive tech once
 * role + the on/off state are set, and the native control gives keyboard
 * (Space) + `disabled` for free. The input is visually hidden (kept for a11y +
 * as the state owner); a styled track + sliding thumb sit beside the label,
 * driven off the input's :checked / :focus-visible via sibling selectors. The
 * state is the thumb position (never colour alone). Label typography matches
 * TextField / Checkbox.
 */
export const Switch = (props: SwitchProps) => {
  const autoId = createUniqueId();
  const inputId = () => props.id ?? autoId;

  return (
    <label
      class={props.class ? `${styles.root} ${props.class}` : styles.root}
      data-disabled={props.disabled ? '' : undefined}
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
};
