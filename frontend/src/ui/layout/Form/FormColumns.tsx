import { splitProps, type JSX } from 'solid-js';
import styles from './FormColumns.module.css';

export type FormColumnsProps = JSX.HTMLAttributes<HTMLDivElement>;

/*
 * FormColumns — the row of section stacks in a multi-column form (see
 * kdd/form-layout). A flex-wrap row of <FormColumn>s: while the width allows,
 * the columns sit side by side sharing it equally; squeezed below the point
 * where they'd fall under a FormColumn's min width, they WRAP to a single
 * stack — intrinsically, with no breakpoint (CLAUDE.md #7). The author places
 * each section in a column explicitly, so grouping is click-traceable and the
 * single-column reading order is column-1 sections, then column-2 sections.
 *
 * Pure layout, owns only the inter-column gap. Hand-rolled, pure CSS + tokens.
 */
export const FormColumns = (props: FormColumnsProps) => {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div
      class={local.class ? `${styles.columns} ${local.class}` : styles.columns}
      {...rest}
    >
      {local.children}
    </div>
  );
};
