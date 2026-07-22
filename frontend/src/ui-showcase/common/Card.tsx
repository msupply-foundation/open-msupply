import type { JSX } from 'solid-js';
import { Text } from '../../ui/elements/typography/Text';
import styles from './Card.module.css';

/**
 * One demo section: a titled header strip over a padded body that opens with
 * a lead paragraph explaining the component under demo. The lead is the app
 * Text primitive; the class adds only colour, measure, spacing, code chips.
 */
export const Card = (props: {
  title: string;
  lead: JSX.Element;
  children: JSX.Element;
}) => (
  <section class={styles.card}>
    <header class={styles.cardHeader}>{props.title}</header>
    <div class={styles.cardBody}>
      <Text variant="body" class={styles.lead}>
        {props.lead}
      </Text>
      {props.children}
    </div>
  </section>
);
