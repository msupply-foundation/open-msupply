import type { JSX } from 'solid-js';
import { Text } from '../../ui/elements/typography/Text';
import styles from './Lead.module.css';

/**
 * The explanatory paragraph opening a demo card, as a standalone child (for
 * card containers that don't take a `lead` prop, e.g. DashboardCard). A
 * veneer over the app's Text primitive: Text owns the type style; the class
 * adds only the muted colour, measure, and code chips.
 */
export const Lead = (props: { children: JSX.Element }) => (
  <Text variant="body" class={styles.lead}>
    {props.children}
  </Text>
);
