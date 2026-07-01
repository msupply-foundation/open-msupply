import type { Table } from '@tanstack/react-table';
import styles from './DataTable.module.css';

const PAGE_SIZES = [10, 25, 50, 100];

/*
 * Client-side pager — reads TanStack's pagination row model. The "X–Y of Z"
 * count sits in an aria-live region so a screen reader hears the range change
 * on page/size changes. (Server pagination would flip the table to "manual"
 * mode and feed it a row count; the control is identical.)
 */
export function Pagination<T>({ table }: { table: Table<T> }) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  const first = total === 0 ? 0 : pageIndex * pageSize + 1;
  const last = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <div className={styles.pagination}>
      <label className={styles.pageSize}>
        Rows per page
        <select
          value={pageSize}
          onChange={e => table.setPageSize(Number(e.target.value))}
        >
          {PAGE_SIZES.map(n => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <span className={styles.pageInfo} aria-live="polite">
        {first}–{last} of {total}
      </span>

      <div className={styles.pageButtons}>
        <button
          type="button"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label="Previous page"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}
