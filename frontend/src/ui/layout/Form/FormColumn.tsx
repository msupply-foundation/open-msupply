import { splitProps, type JSX } from 'solid-js';
import styles from './FormColumn.module.css';

export interface FormColumnProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * The min inline size this column keeps before the row of columns wraps to a
   * single stack. Any CSS length; defaults to the `--measure-form-column`
   * token (22rem). Two default columns + the FormColumns gap collapse to one
   * at roughly 46rem of body width.
   */
  minWidth?: string;
}

/*
 * FormColumn — one vertical stack of <FormSection>s inside <FormColumns> (see
 * kdd/form-layout). Sets the `--form-column-min` that FormColumns' rule turns
 * into each column's flex-basis, so sibling columns share the width equally
 * and wrap to a single stack when squeezed (the `minWidth` knob) — only inside
 * that row; stacks its sections with a consistent gap. Pure layout,
 * hand-rolled CSS. That rule (`.columns > [data-form-column]`) outranks a
 * single class, so a caller's own `class` cannot override a column's `flex`;
 * `minWidth` is the supported knob.
 */
export const FormColumn = (props: FormColumnProps) => {
  const [local, rest] = splitProps(props, ['minWidth', 'class', 'children']);
  return (
    <div
      class={local.class ? `${styles.column} ${local.class}` : styles.column}
      data-form-column=""
      style={
        local.minWidth ? { '--form-column-min': local.minWidth } : undefined
      }
      {...rest}
    >
      {local.children}
    </div>
  );
};
