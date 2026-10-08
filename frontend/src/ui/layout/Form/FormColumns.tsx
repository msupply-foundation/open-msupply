import { splitProps, type JSX } from 'solid-js';
import styles from './FormColumns.module.css';

export interface FormColumnsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * Side-by-side columns share one height — the tallest column's — and each
   * column's last block grows into it, so boxed groups (an `InsetPanel` per
   * column) end level instead of the shorter one stopping short. Inert once
   * the columns wrap to a single stack: each then keeps its content height.
   */
  stretch?: boolean;
}

/*
 * FormColumns — the row of section stacks in a multi-column form (see
 * kdd/form-layout). A flex-wrap row of <FormColumn>s: while the width allows,
 * the columns sit side by side sharing it equally; squeezed below the point
 * where they'd fall under a FormColumn's min width, they WRAP to a single
 * stack — intrinsically, with no breakpoint (CLAUDE.md #7). The author places
 * each section in a column explicitly, so grouping is click-traceable and the
 * single-column reading order is column-1 sections, then column-2 sections.
 *
 * Pure layout, owns only the inter-column gap (and, with `stretch`, the shared
 * height). Hand-rolled, pure CSS + tokens.
 */
export const FormColumns = (props: FormColumnsProps) => {
  const [local, rest] = splitProps(props, ['class', 'children', 'stretch']);
  return (
    <div
      class={local.class ? `${styles.columns} ${local.class}` : styles.columns}
      data-stretch={local.stretch ? '' : undefined}
      {...rest}
    >
      {local.children}
    </div>
  );
};
