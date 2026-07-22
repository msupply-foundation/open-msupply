import type { JSX } from 'solid-js';
import styles from './Intro.module.css';

/**
 * Standalone intro paragraph at the top of a page, outside any card — the
 * page stack provides its spacing.
 */
export const Intro = (props: { children: JSX.Element }) => (
  <p class={styles.intro}>{props.children}</p>
);
