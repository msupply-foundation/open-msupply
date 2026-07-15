import { createUniqueId, Show, splitProps, type JSX } from 'solid-js';
import { AlertTriangleIcon } from '../../icons';
import styles from './TextField.module.css';

export interface TextFieldProps extends Omit<
  JSX.InputHTMLAttributes<HTMLInputElement>,
  'size'
> {
  label: string;
  /** Shown below the field when there's no error. */
  helperText?: string;
  /** Error message — presence switches the field to the error state. */
  error?: string;
  required?: boolean;
  /** Spec: 2.5rem (40px) default, 2.25rem (36px) small. */
  size?: 'default' | 'small';
  /** Spec max-widths: short 25rem (codes/quantities), long 37.5rem (names), full = fill. */
  width?: 'short' | 'long' | 'full';
  /** Visually hide the label (kept for a11y) — for use inside a FieldRow that shows it. */
  hideLabel?: boolean;
}

/*
 * Text input — the company design spec (plain HTML <input>, no library):
 *   height 2.5rem / 2.25rem small · 0.75rem h-padding · 1px token border,
 *   TMF-orange on focus · 0.375rem radius · 3px orange focus glow ·
 *   0.875rem text, 0.875rem/500 label · max-width 25rem short / 37.5rem long.
 * Everything is rem/em so it scales with the root font-size; every colour is a
 * token (the error focus glow is --focus-ring-error, added to the theme
 * contract alongside --focus-ring). Solid port of the RnD prototype's
 * TextField. Label/message are wired up via id/for + aria-describedby, and the
 * error state sets aria-invalid — nothing here is conveyed by colour alone
 * (asterisk for required, icon + text for error).
 */
export const TextField = (props: TextFieldProps) => {
  const [local, rest] = splitProps(props, [
    'label',
    'helperText',
    'error',
    'required',
    'size',
    'width',
    'hideLabel',
    'id',
    'class',
  ]);
  const autoId = createUniqueId();
  const inputId = () => local.id ?? autoId;
  const messageId = () => `${inputId()}-message`;

  return (
    <div
      class={local.class ? `${styles.field} ${local.class}` : styles.field}
      data-width={local.width ?? 'short'}
    >
      <label
        class={local.hideLabel ? styles.labelHidden : styles.label}
        for={inputId()}
      >
        {local.label}
        <Show when={local.required}>
          <span class={styles.required} aria-hidden="true">
            *
          </span>
        </Show>
      </label>
      <input
        id={inputId()}
        class={styles.input}
        data-size={local.size ?? 'default'}
        data-error={local.error ? '' : undefined}
        required={local.required}
        aria-invalid={local.error ? 'true' : undefined}
        aria-describedby={
          local.error || local.helperText ? messageId() : undefined
        }
        {...rest}
      />
      <Show
        when={local.error}
        fallback={
          <Show when={local.helperText}>
            <p id={messageId()} class={styles.helper}>
              {local.helperText}
            </p>
          </Show>
        }
      >
        <p id={messageId()} class={styles.error}>
          <AlertTriangleIcon class={styles.errorIcon} />
          {local.error}
        </p>
      </Show>
    </div>
  );
};
