import { For } from 'solid-js';
import styles from './ChartLegend.module.css';

export type ChartLegendItem = {
  /** Colour class from the chart's own module (background for a swatch,
   *  border-block-start colour for a line). */
  class: string;
  label: string;
  /** Render a line sample instead of a filled swatch (for line series). */
  line?: boolean;
};

/** A small, hand-rolled legend. The mark shape (swatch / line) is owned here;
 *  its colour comes from the class the chart passes, so the legend never
 *  learns a palette. */
export const ChartLegend = (props: { items: ChartLegendItem[] }) => (
  <ul class={styles.legend}>
    <For each={props.items}>
      {item => (
        <li class={styles.item}>
          <span
            class={`${item.line ? styles.line : styles.swatch} ${item.class}`}
            aria-hidden="true"
          />
          {item.label}
        </li>
      )}
    </For>
  </ul>
);
