import { splitProps, type JSX } from 'solid-js';
import styles from './Stack.module.css';

export interface StackProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * The rhythm between children: `sm` (--space-2), `md` (--space-4, default),
   * `lg` (--space-6). A preset, not a length — sibling blocks across the app
   * keep the same few gaps.
   */
  gap?: 'sm' | 'md' | 'lg';
}

/*
 * Stack — a vertical run of sibling blocks with a consistent gap (a detail
 * form's identity header / alert / form columns; a modal's lookup-row pair).
 * VERTICAL ONLY, by design: horizontal grouping usually has a more semantic
 * owner that also encodes its wrap behaviour — FormRow, Columns, FormColumns,
 * HeaderButtons, ContentFooterActions, CardGrid — so reach for those first;
 * the generic horizontal counterpart, when none of those fit, is HStack (a
 * sibling in this folder). Pure layout, hand-rolled CSS + tokens.
 */
export const Stack = (props: StackProps) => {
  const [local, rest] = splitProps(props, ['gap', 'class', 'children']);
  return (
    <div
      class={local.class ? `${styles.stack} ${local.class}` : styles.stack}
      data-gap={local.gap ?? 'md'}
      {...rest}
    >
      {local.children}
    </div>
  );
};
