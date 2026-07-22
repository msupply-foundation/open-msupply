import type { JSX } from 'solid-js';
import styles from './ToolbarStub.module.css';

/** Dashed placeholder standing in for real toolbar content in a demo. */
export const ToolbarStub = (props: { children: JSX.Element }) => (
  <span class={styles.toolbarStub}>{props.children}</span>
);
