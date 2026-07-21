import { splitProps, type JSX } from 'solid-js';
import styles from './FormRow.module.css';

export interface FormRowProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * The min inline size each item keeps before the row wraps to stacked. Any
   * CSS length; defaults to `10rem`. Two default items + the row gap stack at
   * roughly 21rem of available width.
   */
  minItemWidth?: string;
}

/*
 * FormRow — puts two (or more) fields side by side on one line (see
 * kdd/form-layout): the "two-up row" a FormSection reaches for on the specific
 * rows that pair, e.g. Expiry / Manufacture date or Cost / Sell price. Each
 * child takes an equal share and the row WRAPS to stacked when it can't hold
 * them at their min width — intrinsically, no breakpoint (CLAUDE.md #7).
 *
 * Opt-in per row: a single field sits directly in the FormSection at full
 * width and needs no FormRow. Pure layout — never styles the controls; they
 * keep their own look and fill the slot the row hands them. Hand-rolled CSS.
 */
export const FormRow = (props: FormRowProps) => {
  const [local, rest] = splitProps(props, [
    'minItemWidth',
    'class',
    'children',
  ]);
  return (
    <div
      class={local.class ? `${styles.row} ${local.class}` : styles.row}
      style={{ '--form-row-min': local.minItemWidth ?? '10rem' }}
      {...rest}
    >
      {local.children}
    </div>
  );
};
