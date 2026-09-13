import { splitProps, type JSX } from 'solid-js';
import styles from './CardGrid.module.css';

export interface CardGridProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * Minimum column width before the grid drops to fewer columns. Any CSS
   * length; defaults to a card-sized 20rem. Drives the intrinsic `auto-fit`
   * track sizing.
   */
  minColumnWidth?: string;
  /**
   * Cap on column growth. Default (`1fr`) shares all leftover width equally, so
   * columns balloon on very wide bodies; a length (e.g. `40rem`) pins columns
   * at that width instead — `auto-fit` then packs as many capped columns as
   * fit and leaves the leftover empty at the inline end. With a cap set, the
   * cap (not `minColumnWidth`) decides the column count.
   */
  maxColumnWidth?: string;
  /**
   * Cap on how wide each CARD grows, leaving the column count alone —
   * the knob for a grid whose item count varies at runtime. `maxColumnWidth`
   * caps the track, so it also decides how many columns fit; this caps the item
   * inside its `1fr` share, so a grid holding one card renders it at a card's
   * width (aligned to the row start, leftover empty) while a full grid keeps
   * every column it would otherwise have. Any CSS length; unset = no cap.
   */
  maxItemWidth?: string;
}

/*
 * Generic responsive card grid (ui-standards § Layout) — a bare intrinsic
 * `auto-fit` grid: it fits as many equal columns of at least `minColumnWidth`
 * as the width allows and wraps the rest, with no breakpoint maths (principle:
 * intrinsic-first layout). Hand-rolled, owns its CSS so pages/sections compose
 * without styling. First consumer: the dashboard.
 */
export const CardGrid = (props: CardGridProps) => {
  const [local, rest] = splitProps(props, [
    'minColumnWidth',
    'maxColumnWidth',
    'maxItemWidth',
    'class',
    'children',
  ]);
  return (
    <div
      class={local.class ? `${styles.grid} ${local.class}` : styles.grid}
      style={{
        '--card-grid-min': local.minColumnWidth ?? '20rem',
        '--card-grid-max': local.maxColumnWidth ?? '1fr',
        '--card-grid-item-max': local.maxItemWidth ?? 'none',
      }}
      {...rest}
    >
      {local.children}
    </div>
  );
};
