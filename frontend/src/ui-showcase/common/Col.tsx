import type { JSX } from 'solid-js';
import styles from './Col.module.css';

/**
 * A vertical stack of demo items. `gap` picks the spacing (`md` default);
 * `align="start"` makes items hug their content instead of stretching.
 */
export const Col = (props: {
  children: JSX.Element;
  gap?: 'sm' | 'lg';
  align?: 'start';
}) => (
  <div class={styles.col} data-gap={props.gap} data-align={props.align}>
    {props.children}
  </div>
);
