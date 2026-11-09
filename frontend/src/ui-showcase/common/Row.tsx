import type { JSX } from 'solid-js';
import styles from './Row.module.css';

/**
 * A group of demo controls laid out inline — wraps, so it survives narrow
 * viewports and 200% zoom. `gap="sm"` tightens the spacing for small items
 * like chips; `align="start"` top-aligns items of unequal height (the default
 * centres, which suits single-line controls).
 */
export const Row = (props: {
  children: JSX.Element;
  gap?: 'sm';
  align?: 'start';
}) => (
  <div class={styles.row} data-gap={props.gap} data-align={props.align}>
    {props.children}
  </div>
);
