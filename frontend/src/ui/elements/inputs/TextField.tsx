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
  /**
   * `data-testid` for the error message (locale-stable test hook,
   * e2e/TESTIDS.md) — e.g. the line-edit modal's per-line errors.
   */
  errorTestId?: string;
  required?: boolean;
  /** Spec: 2.5rem (40px) default, 2.25rem (36px) small. */
  size?: 'default' | 'small';
  /**
   * Max-width caps (the container can always be narrower): compact 10rem
   * (numbers/money — NumberField's default; caps only the input box, while
   * the label and helper/error text wrap at the short cap), short 25rem
   * (codes/short text), long 37.5rem (names), full = fill.
   */
  width?: 'compact' | 'short' | 'long' | 'full';
  /**
   * Visually hide the label (kept for a11y) — for use inside a FieldRow that
   * shows it.
   */
  hideLabel?: boolean;
  /**
   * An affordance rendered inline after the label text — the InfoTooltip help
   * icon whose bubble explains the field (e.g. the currency rate). Kept beside
   * the label rather than in the field frame so it isn't part of the input's
   * accessible name. Ignored under `hideLabel` (no label is rendered).
   */
  labelInfo?: JSX.Element;
  /**
   * Short text rendered inside the field frame before/after the input — a
   * currency symbol, a unit ("%", "packs"). Decorative (aria-hidden): the
   * label must carry the meaning. With an adornment present the border box
   * moves to a focus-within wrapper; without one the DOM/styling is unchanged.
   */
  startAdornment?: string;
  endAdornment?: string;
  /**
   * An *interactive* control at the inline-end inside the field frame — a real
   * focusable button, unlike the decorative (aria-hidden) `endAdornment`. The
   * same end icon-button affordance as Combobox's clear button (ui-standards
   * sanctions a trailing icon-button in a text field). Its presence moves the
   * border box to the focus-within wrapper, exactly like the adornments. Used
   * by PasswordField for its show/hide toggle.
   */
  endAction?: JSX.Element;
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
    'errorTestId',
    'required',
    'size',
    'width',
    'hideLabel',
    'labelInfo',
    'startAdornment',
    'endAdornment',
    'endAction',
    'id',
    'class',
  ]);
  const autoId = createUniqueId();
  const inputId = () => local.id ?? autoId;
  const messageId = () => `${inputId()}-message`;

  // The <label for> itself (text + required asterisk). A local component so it
  // renders fresh in either branch (bare, or beside labelInfo) — reusing one
  // JSX node across both would try to mount it in two places.
  const Label = () => (
    <label class={styles.label} for={inputId()}>
      {local.label}
      <Show when={local.required}>
        <span class={styles.required} aria-hidden="true">
          *
        </span>
      </Show>
    </label>
  );

  return (
    <div
      class={local.class ? `${styles.field} ${local.class}` : styles.field}
      data-width={local.width ?? 'short'}
      data-size={local.size ?? 'default'}
    >
      {/* hideLabel names the input via aria-label INSTEAD of rendering a
          visually-hidden <label>: the accessible name is identical, but no
          duplicate text node exists beside the visible label the surrounding
          layout (a FieldRow) already shows — a hidden twin trips strict
          text-locator matches in the shared e2e suites. */}
      <Show when={!local.hideLabel}>
        <Show when={local.labelInfo} fallback={<Label />}>
          {/* labelInfo sits OUTSIDE the <label for>, as a sibling: nested in
              the label its accessible name would leak into the input's (the
              name-from-label computation concatenates descendant controls). */}
          <span class={styles.labelRow}>
            <Label />
            {local.labelInfo}
          </span>
        </Show>
      </Show>
      <div
        class={styles.inputWrap}
        data-adorned={
          local.startAdornment || local.endAdornment || local.endAction
            ? ''
            : undefined
        }
        data-size={local.size ?? 'default'}
        data-error={local.error ? '' : undefined}
      >
        <Show when={local.startAdornment}>
          <span class={styles.adornment} aria-hidden="true">
            {local.startAdornment}
          </span>
        </Show>
        <input
          id={inputId()}
          class={styles.input}
          data-size={local.size ?? 'default'}
          data-error={local.error ? '' : undefined}
          required={local.required}
          aria-label={local.hideLabel ? local.label : undefined}
          aria-invalid={local.error ? 'true' : undefined}
          aria-describedby={
            local.error || local.helperText ? messageId() : undefined
          }
          {...rest}
        />
        <Show when={local.endAdornment}>
          <span class={styles.adornment} aria-hidden="true">
            {local.endAdornment}
          </span>
        </Show>
        <Show when={local.endAction}>
          <span class={styles.endAction}>{local.endAction}</span>
        </Show>
      </div>
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
