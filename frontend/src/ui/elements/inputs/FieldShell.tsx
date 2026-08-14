import { children, Show, type JSX } from 'solid-js';
import { AlertTriangleIcon } from '../../icons';
import styles from './DateTimeFields.module.css';

export interface FieldShellProps {
  label: string;
  /** Visually hide the label (kept for a11y) — for use inside a FieldRow. */
  hideLabel?: boolean;
  /**
   * Max-width CAP — opt-in, TextField's vocabulary and TextField's default:
   * `full` (fill the container). `compact` (10rem) narrows only the control
   * box, for a dense row like a page-header toolbar; `short` (25rem) / `long`
   * (37.5rem) cap the whole field.
   */
  width?: 'compact' | 'short' | 'long' | 'full';
  required?: boolean;
  /** Error message — presence switches the field to the error state. */
  error?: string;
  /** Shown below the field when there's no error. */
  helperText?: string;
  /**
   * An affordance rendered inline after the label text — the InfoTooltip help
   * icon, as TextField's slot of the same name. The place for an explanation
   * that would otherwise sit under the control as permanent `helperText`: in a
   * dense row (a header field cluster) a two- or three-line helper paragraph
   * drags the whole strip taller, so a standing explanation belongs on the
   * label. Keep `helperText` for text that must always be read.
   */
  labelInfo?: JSX.Element;
  /** id of the control the label points at (also seeds the message id). */
  controlId: string;
  /**
   * Renders the control, given the `aria-describedby`/`aria-invalid` to set.
   */
  children: (a: {
    describedBy: string | undefined;
    invalid: true | undefined;
  }) => JSX.Element;
}

/*
 * The label + helper/error chrome shared by the headless date/time fields —
 * the same contract as TextField (label[for] + aria-describedby, aria-invalid,
 * required asterisk, error as icon + text, never colour alone), factored out
 * because these controls are composites rather than a single <input>.
 */
export const FieldShell = (props: FieldShellProps) => {
  const messageId = `${props.controlId}-message`;
  // Render the control ONCE, in the (untracked) component body. Rendering it
  // inside JSX here would re-run — and so tear down and recreate the control,
  // losing input focus — whenever a tracked prop it reads (e.g. a helperText
  // that interpolates the live value) changes. See
  // kdd/solid-reactivity-pitfalls.
  const control = props.children({
    describedBy: props.error || props.helperText ? messageId : undefined,
    invalid: props.error ? true : undefined,
  });

  // The <label for> itself (text + required asterisk). A local component so it
  // renders fresh in either branch (bare, or beside labelInfo) — reusing one
  // JSX node across both would try to mount it in two places. As TextField.
  // Resolved once — a JSX prop read twice builds two element trees
  // (kdd/solid-reactivity-pitfalls §3).
  const labelInfo = children(() => props.labelInfo);
  const Label = () => (
    <label
      class={props.hideLabel ? styles.labelHidden : styles.label}
      for={props.controlId}
    >
      {props.label}
      <Show when={props.required}>
        <span class={styles.required} aria-hidden="true">
          *
        </span>
      </Show>
    </label>
  );

  return (
    <div class={styles.field} data-width={props.width ?? 'full'}>
      <Show when={labelInfo() && !props.hideLabel} fallback={<Label />}>
        {/* labelInfo sits OUTSIDE the <label for>, as a sibling: nested in the
            label its accessible name would leak into the control's (the
            name-from-label computation concatenates descendant controls). */}
        <span class={styles.labelRow}>
          <Label />
          {labelInfo()}
        </span>
      </Show>
      {control}
      <Show
        when={props.error}
        fallback={
          <Show when={props.helperText}>
            <p id={messageId} class={styles.helper}>
              {props.helperText}
            </p>
          </Show>
        }
      >
        <p id={messageId} class={styles.error}>
          <AlertTriangleIcon class={styles.errorIcon} />
          {props.error}
        </p>
      </Show>
    </div>
  );
};
