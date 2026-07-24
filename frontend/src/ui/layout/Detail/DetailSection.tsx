import { Show, type JSX } from 'solid-js';
import styles from './DetailSection.module.css';

/*
 * DetailSection — a group of DetailRows laid out as a two-column grid
 * (spec/ui-standards/detail-views): the label column auto-sizes to the widest
 * label in the section (so labels hug their values with no wide empty gap), the
 * value column takes the rest. Each DetailRow is `display: contents`, so its
 * label + value drop straight into this grid. An optional heading sits over the
 * value column.
 */
export const DetailSection = (props: {
  title?: string;
  children: JSX.Element;
}): JSX.Element => (
  <div class={styles.section}>
    <Show when={props.title}>
      <h3 class={styles.headingTitle}>{props.title}</h3>
    </Show>
    {props.children}
  </div>
);
