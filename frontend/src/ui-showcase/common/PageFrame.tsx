import type { JSX } from 'solid-js';
import styles from './PageFrame.module.css';

/**
 * Bordered frame that clips an embedded layout component (Header,
 * ContentFooter, TabBar…) to page shape inside a demo card.
 */
export const PageFrame = (props: { children: JSX.Element }) => (
  <div class={styles.pageFrame}>{props.children}</div>
);

/** Blank stand-in for page content below an embedded layout component. */
export const PageBody = () => (
  <div class={styles.pageBody} aria-hidden="true" />
);
