import type { JSX } from 'solid-js';
import styles from './Card.module.css';

/**
 * One demo section: a titled header strip over a padded body that opens with
 * a lead paragraph explaining the component under demo.
 */
export const Card = (props: {
  title: string;
  lead: JSX.Element;
  children: JSX.Element;
}) => (
  <section class={styles.card}>
    <header class={styles.cardHeader}>{props.title}</header>
    <div class={styles.cardBody}>
      <p class={styles.lead}>{props.lead}</p>
      {props.children}
    </div>
  </section>
);
