import type { JSX } from 'solid-js';
import { Text } from '../../ui/elements/typography/Text';
import styles from './Note.module.css';

/**
 * Follow-up remark or live readout below a demo. Pass `role="status"` when
 * the content updates in response to interaction, so screen readers announce
 * it. A veneer over the app Text primitive: Text owns the type style; the
 * class adds only colour and spacing.
 */
export const Note = (props: { children: JSX.Element; role?: 'status' }) => (
  <Text variant="body" role={props.role} class={styles.note}>
    {props.children}
  </Text>
);
