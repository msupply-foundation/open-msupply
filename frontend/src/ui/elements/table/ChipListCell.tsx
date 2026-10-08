import { For, Show } from 'solid-js';
import type { ColumnMeta } from '@tanstack/solid-table';
import type { CellFragment } from './tableHelpers';
import styles from './ChipListCell.module.css';

/*
 * ChipListCell — an array of short labels rendered as a row of outlined chips
 * inside a table cell (registry role "chip-list cell": e.g. the master lists
 * an item is on, in the stock list). Pure CSS — own the simple.
 *
 * The chips wrap onto further lines when the column is narrow (growing the
 * row, like a wrapping text cell) rather than clipping on one line — which
 * also keeps the column resizable (see the CSS). The container's hover text
 * still carries the full list. An empty list renders a blank cell.
 */
export const ChipListCell = (props: { items: string[] }) => (
  <Show when={props.items.length > 0}>
    <div class={styles.list} title={props.items.join(', ')}>
      <For each={props.items}>
        {item => <span class={styles.chip}>{item}</span>}
      </For>
    </div>
  </Show>
);

// Cell fragment in the tableHelpers idiom — spread into a Column whose
// accessor resolves to string[] (`cell` reads it via info.getValue()).
export const getChipListCell = <T,>(
  meta?: ColumnMeta<never, unknown>
): CellFragment<T> => ({
  meta: { ...meta },
  cell: info => <ChipListCell items={info.getValue<string[]>() ?? []} />,
});
