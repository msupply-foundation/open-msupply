import { flexRender, type Row } from '@tanstack/react-table';
import { cx } from '@/utils/classNames';
import { Checkbox } from './Checkbox';
import styles from './DataTable.module.css';

/*
 * Card view — the narrow-width form of the table. Rather than force a <table>
 * into `display:block` (which strips its table semantics from screen readers),
 * we render a proper <ul> list from the SAME TanStack row model: one card per
 * row, the primary column as the title, the rest as labelled field pairs. Same
 * data, honest markup at both sizes. The card-view sort control lives in the
 * toolbar (headers — and their click-to-sort — are gone here).
 */
export function CardList<T>({
  rows,
  primaryColumnId,
  activeRowId,
  onRowClick,
  isRestricted,
}: {
  rows: Row<T>[];
  primaryColumnId: string;
  activeRowId: string | null;
  onRowClick: (row: Row<T>) => void;
  isRestricted?: (row: T) => boolean;
}) {
  return (
    <ul className={styles.cardList} role="list">
      {rows.map(row => {
        const cells = row
          .getVisibleCells()
          .filter(c => c.column.id !== 'select');
        const primary = cells.find(c => c.column.id === primaryColumnId);
        const rest = cells.filter(c => c.column.id !== primaryColumnId);
        const restricted = isRestricted?.(row.original) ?? false;

        return (
          <li key={row.id}>
            <div
              className={cx(styles.card)}
              data-selected={row.getIsSelected() || undefined}
              data-active={activeRowId === row.id || undefined}
              data-restricted={restricted || undefined}
              onClick={() => onRowClick(row)}
            >
              <div className={styles.cardHead}>
                {row.getCanSelect() && (
                  <Checkbox
                    checked={row.getIsSelected()}
                    onChange={row.getToggleSelectedHandler()}
                    label="Select row"
                  />
                )}
                {primary && (
                  <span className={styles.cardTitle}>
                    {flexRender(
                      primary.column.columnDef.cell,
                      primary.getContext()
                    )}
                  </span>
                )}
              </div>
              <dl className={styles.cardFields}>
                {rest.map(cell => (
                  <div key={cell.id} className={styles.cardField}>
                    <dt className={styles.cardLabel}>
                      {cell.column.columnDef.meta?.label ?? cell.column.id}
                    </dt>
                    <dd className={styles.cardValue}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
