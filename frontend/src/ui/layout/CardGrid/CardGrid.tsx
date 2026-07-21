import { splitProps, type JSX } from 'solid-js';
import styles from './CardGrid.module.css';

export interface CardGridProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * Minimum column width before the grid drops to fewer columns. Any CSS length;
   * defaults to a card-sized 20rem. Drives the intrinsic `auto-fit` track sizing.
   */
  minColumnWidth?: string;
}

/*
 * Generic responsive card grid (ui-standards § Layout) — a bare intrinsic
 * `auto-fit` grid: it fits as many equal columns of at least `minColumnWidth` as
 * the width allows and wraps the rest, with no breakpoint maths (principle:
 * intrinsic-first layout). Hand-rolled, owns its CSS so pages/sections compose
 * without styling. First consumer: the dashboard.
 */
export const CardGrid = (props: CardGridProps) => {
  const [local, rest] = splitProps(props, [
    'minColumnWidth',
    'class',
    'children',
  ]);
  return (
    <div
      class={local.class ? `${styles.grid} ${local.class}` : styles.grid}
      style={{ '--card-grid-min': local.minColumnWidth ?? '20rem' }}
      {...rest}
    >
      {local.children}
    </div>
  );
};
