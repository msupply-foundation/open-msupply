import { createUniqueId, Show } from 'solid-js';
import { AlertTriangleIcon } from '../../icons';
import { BareCheckbox } from './BareCheckbox';
import styles from './Checkbox.module.css';

export interface CheckboxProps {
  /** The visible label; clicking it toggles the box (native <label> wrap). */
  label: string;
  checked?: boolean;
  /** Reports the new checked state. */
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Error message — presence switches the box to the error state + shows it.
   */
  error?: string;
  id?: string;
  class?: string;
  /** Test id on the native input (cross-FE test-id contract). */
  testId?: string;
}

/*
 * Checkbox — the labelled form field: label + error chrome around the ONE
 * drawn checkbox control (BareCheckbox — native input state owner, box +
 * glyph look). Colour never carries meaning alone (the check glyph is the
 * state, an error shows an icon + text). Label/typography match TextField
 * (--text-sm / --weight-medium label, --text-xs error). The <label> wraps
 * everything so a label click toggles the box.
 */
export const Checkbox = (props: CheckboxProps) => {
  const autoId = createUniqueId();
  const inputId = () => props.id ?? autoId;
  const messageId = () => `${inputId()}-message`;

  return (
    <div class={props.class ? `${styles.field} ${props.class}` : styles.field}>
      <label
        class={styles.root}
        data-disabled={props.disabled ? '' : undefined}
      >
        <BareCheckbox
          id={inputId()}
          class={styles.control}
          checked={props.checked}
          disabled={props.disabled}
          error={!!props.error}
          data-testid={props.testId}
          aria-invalid={props.error ? 'true' : undefined}
          aria-describedby={props.error ? messageId() : undefined}
          onChange={event => props.onChange?.(event.currentTarget.checked)}
        />
        <span class={styles.label}>{props.label}</span>
      </label>
      <Show when={props.error}>
        <p id={messageId()} class={styles.error}>
          <AlertTriangleIcon class={styles.errorIcon} />
          {props.error}
        </p>
      </Show>
    </div>
  );
};
