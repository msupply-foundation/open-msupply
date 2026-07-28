import { createUniqueId, Show, splitProps, type JSX } from 'solid-js';
import { AlertTriangleIcon } from '../../icons';
import styles from './TextArea.module.css';

export interface TextAreaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  /** Shown below the field when there's no error. */
  helperText?: string;
  /** Error message — presence switches the field to the error state. */
  error?: string;
  /**
   * `data-testid` for the error message (locale-stable test hook,
   * e2e/TESTIDS.md).
   */
  errorTestId?: string;
  required?: boolean;
  /**
   * Visible text lines — the native `rows` attribute, so it sets the box
   * height. Defaults to 4 (Open mSupply's TextArea default). The height is
   * fixed: longer content scrolls, matching OMS (no resize grip).
   */
  rows?: number;
  /**
   * Spec max-widths, as TextField. Defaults to `full` (fill the container) —
   * OMS's TextArea behaviour, and multi-line fields are usually a
   * dialog/panel's wide field.
   */
  width?: 'short' | 'long' | 'full';
  /**
   * Type scale, as TextField: `default` (14px) or `small` (13px,
   * `--input-font-sm`, label included) — so a multi-line field lines up with
   * the small inputs beside it in a header field cluster (see
   * ui/layout/Header/HeaderToolbar). The box is still `rows` tall, but block
   * padding is derived from the size's input-height token, so `rows={1}` is
   * exactly a TextField's height and `rows={n}` is n lines on that rhythm.
   */
  size?: 'default' | 'small';
  /**
   * Visually hide the label (kept for a11y) — for use inside a FieldRow that
   * shows it.
   */
  hideLabel?: boolean;
}

/*
 * Multi-line text input — the TextField design spec on a plain HTML
 * <textarea> (no library): same 1px token border, TMF-orange focus + 3px
 * glow, 0.375rem radius, 0.875rem text and label, same label/helper/error
 * wiring (id/for + aria-describedby, aria-invalid on error). What differs is
 * only what multi-line forces: height comes from the `rows` prop (default 4, as
 * OMS) rather than being set outright, vertical padding joins the horizontal,
 * and line-height opens to 1.5 for wrapped text. That padding is still DERIVED
 * from the size's input-height token (see the CSS), so `rows={1}` lands exactly
 * on a TextField's height instead of ~1.5px over it. The box is fixed at `rows`
 * — content scrolls, no resize grip — matching the old OMS TextArea (MUI
 * multiline).
 */
export const TextArea = (props: TextAreaProps) => {
  const [local, rest] = splitProps(props, [
    'label',
    'helperText',
    'error',
    'errorTestId',
    'required',
    'rows',
    'width',
    'size',
    'hideLabel',
    'id',
    'class',
  ]);
  const autoId = createUniqueId();
  const textareaId = () => local.id ?? autoId;
  const messageId = () => `${textareaId()}-message`;

  return (
    <div
      class={local.class ? `${styles.field} ${local.class}` : styles.field}
      data-width={local.width ?? 'full'}
      data-size={local.size ?? 'default'}
    >
      <label
        class={local.hideLabel ? styles.labelHidden : styles.label}
        for={textareaId()}
      >
        {local.label}
        <Show when={local.required}>
          <span class={styles.required} aria-hidden="true">
            *
          </span>
        </Show>
      </label>
      <textarea
        id={textareaId()}
        class={styles.textarea}
        data-size={local.size ?? 'default'}
        rows={local.rows ?? 4}
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
        <p
          id={messageId()}
          class={styles.error}
          data-testid={local.errorTestId}
        >
          <AlertTriangleIcon class={styles.errorIcon} />
          {local.error}
        </p>
      </Show>
    </div>
  );
};
