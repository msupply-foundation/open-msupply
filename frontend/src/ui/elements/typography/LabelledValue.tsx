import { splitProps, type JSX } from 'solid-js';
import { Text } from './Text';
import styles from './LabelledValue.module.css';

export interface LabelledValueProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** The field name, shown above the value. */
  label: JSX.Element;
  /**
   * The label itself is identical in both variants (the shared --field-label-*
   * token, matching every input's label). `variant` only tunes the label→value
   * GAP:
   *  - `card` (default) — the tight card / detail-panel / utility-row gap.
   *  - `field` — the input's label→control gap, so a read-only value sits flush
   *    beside editable fields in a form. Read-only-vs-editable reads from the
   *    ABSENCE of an input box, not the label (see kdd/form-layout).
   */
  variant?: 'card' | 'field';
  /**
   * Type scale, matching the input components' `size`: `default` (14px label /
   * body value) or `small` (13px, `--input-font-sm`), so a read-only value
   * lines up with the small inputs it sits among — e.g. in a page-header
   * toolbar row (see the Detail-table showcase).
   */
  size?: 'default' | 'small';
  /**
   * Label placement. `stacked` (default) puts the label above the value — the
   * card / detail-panel field. `inline` sets them on ONE line, label then
   * value, baseline-aligned: for a lone read-only fact in a dense chrome row (a
   * dialog's header context row), where the stack costs a second line of header
   * for one word. Inline is for a SHORT value — a long one wraps under a label
   * it no longer sits beside; stack those.
   */
  layout?: 'stacked' | 'inline';
  /**
   * The value, shown below the label in body text. Pass any node (text, a
   * chip, etc.).
   */
  children: JSX.Element;
}

/*
 * A read-only label-above-value pair — the field unit in a card's detail
 * region, in detail/side panels, and (as `variant="field"`) a read-only field
 * sitting among editable inputs in a form. Stacked (label on top), so a row of
 * these WRAPS intrinsically (CLAUDE.md #7) rather than forcing a fixed grid.
 *
 * Owns its own label/value typography (keyed off `data-variant`) so the `field`
 * variant can match the input label look, which Text's fixed variants don't
 * offer (--text-sm + medium weight); the value stays a <Text> for its body
 * type. Colours are set here — Text never carries colour. Deliberately
 * hand-rolled, pure CSS. A plain block (not a <dl>): key-value-as-description-
 * list is optional for read-only display, and a bare block wraps/reuses freely.
 */
export const LabelledValue = (props: LabelledValueProps) => {
  const [local, rest] = splitProps(props, [
    'label',
    'children',
    'variant',
    'size',
    'layout',
    'class',
  ]);
  return (
    <div
      class={local.class ? `${styles.field} ${local.class}` : styles.field}
      data-variant={local.variant ?? 'card'}
      data-size={local.size ?? 'default'}
      data-layout={local.layout ?? 'stacked'}
      {...rest}
    >
      <span class={styles.label}>{local.label}</span>
      <Text variant="body" as="span" class={styles.value}>
        {local.children}
      </Text>
    </div>
  );
};
