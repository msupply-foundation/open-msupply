import { children, Show, type JSX } from 'solid-js';
import styles from './HeaderField.module.css';

export interface HeaderFieldProps {
  /**
   * What the field asks, shown before the control — a step heading or a
   * short label. The control keeps its own accessible name (pass the control
   * a hidden label carrying the same words).
   */
  label?: JSX.Element;
  /** The one control: a picker or a search field, passed `width="full"`. */
  children: JSX.Element;
  /**
   * A short read-out about the chosen value, after the control (who a chosen
   * patient is, say). Quieter text; it wraps under the control when the row
   * can't hold both.
   */
  detail?: JSX.Element;
}

/*
 * HeaderField — one labelled control on the header's MAIN row, between the
 * breadcrumb and the page actions, for a screen whose first job is that one
 * choice (the Simple dispensing screen's "Who is it for?"). Several fields are
 * a HeaderToolbar's job, on a row of their own.
 *
 * It takes the row's spare width (the control capped at a short input's
 * width) and wraps onto the next line when the row can't spare a usable
 * share — intrinsically, by flex-wrap. Header's narrow tier, where the title
 * row is kept to one line, gives it a row of its own under the title row
 * instead (Header.module.css owns that, as it owns the other rows).
 */
export const HeaderField = (props: HeaderFieldProps) => {
  // Resolved once: JSX-element props are read in one place only.
  const label = children(() => props.label);
  const detail = children(() => props.detail);
  return (
    // data-header-field: Header's narrow-tier rules find this part by it.
    <div class={styles.field} data-header-field="">
      <Show when={label()}>
        <div class={styles.label}>{label()}</div>
      </Show>
      <div class={styles.control}>{props.children}</div>
      <Show when={detail()}>
        <div class={styles.detail}>{detail()}</div>
      </Show>
    </div>
  );
};
