import type { JSX } from 'solid-js';
import styles from './Note.module.css';

/**
 * Follow-up remark or live readout below a demo. Pass `role="status"` when
 * the content updates in response to interaction, so screen readers announce
 * it.
 */
export const Note = (props: { children: JSX.Element; role?: 'status' }) => (
  <p class={styles.note} role={props.role}>
    {props.children}
  </p>
);
