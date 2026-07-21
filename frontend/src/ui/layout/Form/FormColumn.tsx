import { splitProps, type JSX } from 'solid-js';
import styles from './FormColumn.module.css';

export interface FormColumnProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * The min inline size this column keeps before the row of columns wraps to a
   * single stack. Any CSS length; defaults to `22rem`. Two default columns +
   * the FormColumns gap collapse to one at roughly 46rem of body width.
   */
  minWidth?: string;
}

/*
 * FormColumn — one vertical stack of <FormSection>s inside <FormColumns> (see
 * kdd/form-layout). Carries the flex-basis that makes sibling columns share the
 * width equally and wrap to a single stack when squeezed (the `minWidth` knob);
 * stacks its sections with a consistent gap. Pure layout, hand-rolled CSS.
 */
export const FormColumn = (props: FormColumnProps) => {
  const [local, rest] = splitProps(props, ['minWidth', 'class', 'children']);
  return (
    <div
      class={local.class ? `${styles.column} ${local.class}` : styles.column}
      style={{ '--form-column-min': local.minWidth ?? '22rem' }}
      {...rest}
    >
      {local.children}
    </div>
  );
};
