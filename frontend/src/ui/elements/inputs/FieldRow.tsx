import { Show, type JSX } from 'solid-js';
import styles from './FieldRow.module.css';

export interface FieldRowProps {
  /**
   * The field label, shown inline-start (bold), aligned against the control on
   * the right.
   */
  label: JSX.Element;
  /** The control (a Combobox, TextField, etc.), taking the inline-end space. */
  children: JSX.Element;
  /**
   * Label column width. `fixed` (default) reserves a 6rem minimum so labels
   * line up across stacked sibling rows in a form. `auto` reserves nothing — the
   * label takes its natural width and the control sits right after it — for a
   * lone row with no siblings to align to (e.g. a card header field).
   */
  labelWidth?: 'fixed' | 'auto';
  /**
   * Marks the field required — the asterisk goes on THIS row's label, since the
   * wrapped control hides its own (see the note below). Indication only: the
   * gating stays with the form's own confirm rule.
   */
  required?: boolean;
  class?: string;
}

/*
 * An inline label + control row — bold label on the inline-start, the control
 * filling the inline-end — the current app's compact form layout inside a
 * dialog/panel (e.g. the stocktake create form's "Master list:" / "Location:"
 * rows). Hand-rolled layout only; the control it wraps owns its own look.
 * Pairs with InsetPanel.
 *
 * NB: the wrapped control should NOT render its own visible label (this row is
 * the label); pass an accessible name to the control another way (e.g.
 * aria-label) for a11y.
 */
export const FieldRow = (props: FieldRowProps): JSX.Element => (
  <div
    class={props.class ? `${styles.row} ${props.class}` : styles.row}
    data-label-width={props.labelWidth ?? 'fixed'}
  >
    <span class={styles.label}>
      {props.label}
      <Show when={props.required}>
        <span class={styles.required} aria-hidden="true">
          *
        </span>
      </Show>
    </span>
    <div class={styles.control}>{props.children}</div>
  </div>
);
