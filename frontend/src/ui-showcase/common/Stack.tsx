import type { JSX } from 'solid-js';
import styles from './Stack.module.css';

/** Root column of a showcase page — demo cards stack with even spacing. */
export const Stack = (props: { children: JSX.Element }) => (
  <div class={styles.stack}>{props.children}</div>
);
