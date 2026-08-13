import { Match, Show, Switch } from 'solid-js';
import { NavigateBeforeIcon, NavigateNextIcon } from '../../icons';
import { Select } from '../selectors/Select';
import { t, tPlural } from '../../../intl';
import { paginationState } from './paginationState';
import styles from './Pagination.module.css';

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

export interface PaginationProps {
  /** Zero-based row offset of the current page. */
  offset: number;
  /** Rows per page. */
  pageSize: number;
  /** Total matching rows (across all pages). */
  total: number;
  /** Requests a new offset — the parent owns the page state (URL params). */
  onOffsetChange: (offset: number) => void;
  /**
   * Requests a new page size. When given, a rows-per-page selector is shown;
   * the
   *  parent resets to the first page on change. Omit to hide the selector. */
  onPageSizeChange?: (pageSize: number) => void;
  /** Selectable rows-per-page options (default 20 / 50 / 100). */
  pageSizes?: number[];
  /**
   * Opt in to the CONDITIONAL footer (spec/ui-standards § tables →
   * pagination): the bar earns its space instead of being stable chrome, and
   * moves through three states as the row count changes —
   *   0 rows            → nothing at all (the host drops the footer bar too:
   *                       DataTable reads `./paginationState` for exactly
   *                       that);
   *   one page          → this prop's value decides — 'count' shows the row
   *                       count alone, inline-start ("14 items"), with no
   *                       pager since there is nowhere to navigate to;
   *                       'nothing' drops the bar as at 0 rows;
   *   more than a page  → the full bar (unchanged).
   * Pass 'count' where the row count is a fact about the record the table
   * belongs to (a shipment's lines) and 'nothing' for a list, where one page
   * means every row is already on screen. Omit the prop entirely and the bar
   * always renders in full ("0–0 of 0" over an empty table) — the
   * stable-chrome default the verticals that have not adopted this keep.
   */
  conditional?: 'count' | 'nothing';
}

/*
 * List pagination (ui-standards § tables → pagination, unit 10): ONE
 * inline-end cluster — rows-per-page selector, the range "1–20 of 38"
 * (quiet, tabular-nums; the old bold far-left "Showing X-Y of Z" summary
 * is retired), then the pager. The pager keeps our fixed-slot layout
 * ([1] ‹ [k] › [N] — a recorded deviation from the spec's plain pill
 * list, which has no truncation model for many pages) restyled to the
 * spec: action-blue current pill, --radius-sm, quiet hover. At ≤480px
 * the rows-per-page selector and the number slots hide, leaving ‹ › +
 * the range (the spec's mobile collapse).
 *
 * Hand-rolled over native <button>s (role + keyboard + disabled for free); the
 * range is a live region so a screen reader hears the page change. The
 * parent owns offset/pageSize (destined for URL params); this component is
 * pure presentation over them. The pager arrows (prev / next)
 * are ported verbatim from the current app's MUI icons so they pixel-match;
 * RTL mirrors via the icons' data-flip-rtl.
 */
export const Pagination = (props: PaginationProps) => {
  const from = () => (props.total === 0 ? 0 : props.offset + 1);
  const to = () => Math.min(props.offset + props.pageSize, props.total);
  const pageCount = () => Math.max(1, Math.ceil(props.total / props.pageSize));
  const currentPage = () => Math.floor(props.offset / props.pageSize) + 1; // 1-based
  const hasPrev = () => currentPage() > 1;
  const hasNext = () => currentPage() < pageCount();
  const pageSizes = () => props.pageSizes ?? DEFAULT_PAGE_SIZES;

  // The pager is a FIXED set of five slots so nothing appears/disappears as you
  // page (no reflow): [first] ‹ [middle] › [last].
  // - first(1) / last(N) are jump buttons, EXCEPT when you're on that page —
  //   then that slot renders the current-page (non-interactive) style instead.
  // - prev / next stay put and just disable at the boundaries.
  // - the MIDDLE slot always shows a number, so the row width is constant: the
  //   current page (current-style) on in-between pages, but the neighbour
  //   towards the middle at the ends (page 2 on the first page, page N-1 on the
  //   last) as a clickable jump — so the slot is never empty. e.g.
  //     page 1 → (1) ‹ 2 › N
  //     page k → 1 ‹ (k) › N
  //     page N → 1 ‹ N-1 › (N)
  const onFirst = () => currentPage() === 1;
  const onLast = () => currentPage() === pageCount();
  // The number the middle slot shows, and whether that IS the current page (→
  // current-style, non-clickable) or a neighbour to jump to (→ a button).
  const middlePage = () =>
    onFirst()
      ? Math.min(2, pageCount())
      : onLast()
        ? Math.max(pageCount() - 1, 1)
        : currentPage();
  const middleIsCurrent = () => !onFirst() && !onLast();

  const goToPage = (page: number) => {
    const clamped = Math.min(Math.max(1, page), pageCount());
    props.onOffsetChange((clamped - 1) * props.pageSize);
  };

  // Which face to show — read inside JSX (below) so a row-count change swaps
  // faces; a component body runs once, so an early `return` on this would
  // freeze the footer at its first state.
  const state = () => paginationState(props);

  // The rows-per-page control, shared by both faces that can carry it.
  const RowsPerPage = () => (
    <Show when={props.onPageSizeChange}>
      <Select
        class={styles.pageSize}
        size="small"
        label={t('pagination.rows')}
        testId="rows-per-page-select"
        value={String(props.pageSize)}
        options={pageSizes().map(size => ({
          value: String(size),
          label: String(size),
        }))}
        // Guard against no-op emissions: the Select re-fires onValueChange
        // when it re-mounts (e.g. this pager now lives inside the DataTable
        // overlay, which re-renders on data change), and onPageSizeChange
        // resets the page to 0 — so an unguarded no-op would snap the page
        // back to 1 right after the user navigated. Only fire on a REAL size
        // change.
        onValueChange={v => {
          const next = Number(v);
          if (next !== props.pageSize) props.onPageSizeChange!(next);
        }}
      />
    </Show>
  );

  // On the count face the rows-per-page control is dropped as a dead control —
  // but it is only dead if NO offered size could split this set. With a smaller
  // size on offer than the row count (our default options start at 10, so a
  // 14-row set is pageable at 10), keeping it is what lets the user get the
  // pager back; dropping it would strand them at the size they just chose (a
  // 45-row list paged at 100 could never be re-paged).
  const smallerSizeWouldPage = () => Math.min(...pageSizes()) < props.total;

  return (
    <Switch>
      {/* One page under the conditional rule: the count, inline-start, and no
          pager — there is nowhere to navigate. Not a <nav> for that reason, but
          it keeps the table-pagination test id: it IS the footer's count face.
          The 'hidden' state matches neither arm, so nothing renders (DataTable
          drops the footer bar around it — see paginationState). */}
      <Match when={state() === 'count'}>
        <div
          class={`${styles.pagination} ${styles.countOnly}`}
          data-testid="table-pagination"
        >
          <Show when={smallerSizeWouldPage()}>
            <RowsPerPage />
          </Show>
          <span class={styles.range} aria-live="polite">
            {tPlural('pagination.count', props.total)}
          </span>
        </div>
      </Match>
      <Match when={state() === 'full'}>
        {/* The full bar. Under the stable-chrome default (no `conditional`) it
            renders at any row count, including zero ("0–0 of 0", pager disabled
            on its one page) as in the current app; a `conditional` host reaches
            it only with more than one page. */}
        <nav
          class={styles.pagination}
          aria-label={t('pagination.label')}
          data-testid="table-pagination"
        >
          <RowsPerPage />
          {/* The range "1–20 of 38" — quiet body-tone text (no bold; unit 10),
          tabular-nums so the digits keep constant width while paging. */}
          <span class={styles.range} aria-live="polite">
            {from()}–{to()} {t('pagination.of')} {props.total}
          </span>
          {/* Compact pager, fixed slots so nothing shifts as you page within a
                dataset: [first] ‹ [middle] › [last]. first(1)/last(N) are jump
                buttons that render as the current-page style when you're ON that
                page; prev/next stay put and disable at the boundaries; the middle
                always shows a number (current on in-between pages, else the
                neighbour towards the middle) so the row width is constant. So for
                N > 2:  page 1 → (1) ‹ 2 › N   ·   page k → 1 ‹ (k) › N   ·
                page N → 1 ‹ N-1 › (N). The middle only exists when N > 2 (with ≤ 2
                pages first/last already cover them); the last slot only when N > 1
                (a single page is just the "(1)" first slot + disabled arrows). */}
          <div class={styles.pager}>
            {/* First slot — the current-page display when on page 1, else a
                  jump-to-first button. */}
            <Show
              when={!onFirst()}
              fallback={
                <span
                  class={`${styles.pageCurrent} ${styles.numberSlot}`}
                  data-testid="pagination-current-page"
                  aria-current="page"
                >
                  1
                </span>
              }
            >
              <button
                type="button"
                class={`${styles.pageButton} ${styles.numberSlot}`}
                onClick={() => goToPage(1)}
                data-testid="pagination-first"
                aria-label={t('pagination.first')}
              >
                1
              </button>
            </Show>
            <button
              type="button"
              class={styles.pageButton}
              onClick={() => goToPage(currentPage() - 1)}
              disabled={!hasPrev()}
              data-testid="pagination-previous"
              aria-label={t('pagination.previous')}
            >
              <NavigateBeforeIcon />
            </button>
            {/* Page position "1 / 8" — the narrow-screen stand-in for the
                number slots, which hide at ≤480px and would otherwise leave
                two bare arrows with no sense of where you are. CSS-gated to
                that width (hidden above it, where the slots do the job), and
                aria-hidden because the range beside it already announces the
                position to a screen reader at every width. */}
            <span class={styles.position} aria-hidden="true">
              {currentPage()} / {pageCount()}
            </span>
            {/* Middle slot — only meaningful with > 2 pages (with ≤ 2, the
                  first/last slots already show every page). Always a number so the
                  row width is constant: the current page (current-style) on
                  in-between pages, else a clickable jump to the neighbour towards
                  the middle (page 2 on the first page, page N-1 on the last). */}
            <Show when={pageCount() > 2}>
              <Show
                when={middleIsCurrent()}
                fallback={
                  <button
                    type="button"
                    class={`${styles.pageButton} ${styles.numberSlot}`}
                    onClick={() => goToPage(middlePage())}
                    data-testid="pagination-middle"
                    aria-label={t('pagination.go-to-page', {
                      page: middlePage(),
                    })}
                  >
                    {middlePage()}
                  </button>
                }
              >
                <span
                  class={`${styles.pageCurrent} ${styles.numberSlot}`}
                  data-testid="pagination-current-page"
                  aria-current="page"
                >
                  {currentPage()}
                </span>
              </Show>
            </Show>
            <button
              type="button"
              class={styles.pageButton}
              onClick={() => goToPage(currentPage() + 1)}
              disabled={!hasNext()}
              data-testid="pagination-next"
              aria-label={t('pagination.next')}
            >
              <NavigateNextIcon />
            </button>
            {/* Last slot — only when there's more than one page (a single page is
                  just the "(1)" first slot). The current-page display when on the
                  last page, else a jump-to-last button. */}
            <Show when={pageCount() > 1}>
              <Show
                when={!onLast()}
                fallback={
                  <span
                    class={`${styles.pageCurrent} ${styles.numberSlot}`}
                    data-testid="pagination-current-page"
                    aria-current="page"
                  >
                    {pageCount()}
                  </span>
                }
              >
                <button
                  type="button"
                  class={`${styles.pageButton} ${styles.numberSlot}`}
                  onClick={() => goToPage(pageCount())}
                  data-testid="pagination-last"
                  aria-label={t('pagination.last')}
                >
                  {pageCount()}
                </button>
              </Show>
            </Show>
          </div>
        </nav>
      </Match>
    </Switch>
  );
};
