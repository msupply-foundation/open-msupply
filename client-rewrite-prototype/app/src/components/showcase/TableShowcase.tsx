import { useMemo, useState } from 'react';
import type { ColumnFiltersState } from '@tanstack/react-table';
import { DataTable } from '@/components/table/DataTable';
import { outboundColumns } from '@/components/table/columns';
import {
  isRestricted,
  makeOutboundShipments,
  type OutboundShipmentRow,
} from '@/mocks/outboundShipments';
import { useSearchString } from '@/hooks/useUrlState';
import { cx } from '@/utils/classNames';
import styles from './TableShowcase.module.css';

type Mode = 'demo' | 'benchmark';
const ROW_COUNT: Record<Mode, number> = { demo: 400, benchmark: 10_000 };

// Text filters share their column id with the URL param name; status is a
// repeated param of status enums.
const TEXT_FILTER_IDS = ['otherPartyName', 'invoiceNumber', 'theirReference'] as const;

/*
 * Table showcase — the storybook centrepiece and the TanStack validation gate.
 * A real semantic <table> driven by TanStack's headless engine, styled entirely
 * with our tokens/CSS Modules. Two data sets: the paginated everyday list, and
 * a 10k-row virtualised set for the row-count / scroll benchmark.
 */
export const TableShowcase = () => {
  const [mode, setMode] = useState<Mode>('demo');
  const data = useMemo(() => makeOutboundShipments(ROW_COUNT[mode]), [mode]);

  // Filters are read from the URL (written by the header FilterBar). Parsing in
  // a memo keyed on the search string keeps columnFilters referentially stable,
  // so the filtered row model only recomputes when the URL actually changes.
  const search = useSearchString();
  const columnFilters = useMemo<ColumnFiltersState>(() => {
    const params = new URLSearchParams(search);
    const filters: ColumnFiltersState = [];
    for (const id of TEXT_FILTER_IDS) {
      const value = params.get(id);
      if (value) filters.push({ id, value });
    }
    const statuses = params.getAll('status');
    if (statuses.length) filters.push({ id: 'status', value: statuses });
    return filters;
  }, [search]);

  return (
    <div className={styles.stack}>
      <div className={styles.intro}>
        <p className={styles.lead}>
          A native <code>&lt;table&gt;</code> rendered from TanStack Table's
          headless row model — sort, filter, pagination, show/hide, resize,
          reorder and pinning are all engine state; every element of markup and
          style is ours. Sort headers announce via <code>aria-sort</code> + a
          live region; the first column is frozen; columns resize (drag or arrow
          keys) and reorder (drag or keyboard, via dnd-kit). Narrow the window to
          see it become a card list.
        </p>
        <div className={styles.modes} role="group" aria-label="Data set">
          <button
            type="button"
            className={cx(styles.mode, mode === 'demo' && styles.modeActive)}
            aria-pressed={mode === 'demo'}
            onClick={() => setMode('demo')}
          >
            Demo — 400 rows, paginated
          </button>
          <button
            type="button"
            className={cx(styles.mode, mode === 'benchmark' && styles.modeActive)}
            aria-pressed={mode === 'benchmark'}
            onClick={() => setMode('benchmark')}
          >
            Benchmark — 10,000 rows, virtualised
          </button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <DataTable<OutboundShipmentRow>
          // Paginated vs virtualised are distinct table configurations (the
          // scroll model differs); remount on switch so the virtualizer inits
          // cleanly instead of reconfiguring a live instance.
          key={mode}
          data={data}
          columns={outboundColumns}
          getRowId={row => row.id}
          stickyColumnId="otherPartyName"
          columnFilters={columnFilters}
          isRestricted={isRestricted}
          virtualise={mode === 'benchmark'}
        />
      </div>
    </div>
  );
};
