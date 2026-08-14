import { createSignal, For, Show } from 'solid-js';
import { NavigateBeforeIcon, NavigateNextIcon } from '../../icons';
import { t } from '../../../intl';
import { paginationState } from './paginationState';
import styles from './Pagination.module.css';

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
   * Requests a new page size. **Currently unrendered** — the bar shows the
   * pager alone, so nothing in it offers a size change; the page size is still
   * live state (URL-backed, remembered per user) and hosts still pass this, so
   * it is kept for the control's return rather than deleted along with the
   * plumbing behind it.
   */
  onPageSizeChange?: (pageSize: number) => void;
  /** Selectable rows-per-page options. Unrendered — see `onPageSizeChange`. */
  pageSizes?: number[];
  /**
   * Opt in to the CONDITIONAL footer (spec/ui-standards § tables →
   * pagination): the bar earns its space instead of being stable chrome. It
   * renders only when there is somewhere to page to — no rows, or a single
   * page of them, and there is nothing here at all (the host drops the footer
   * band too: DataTable reads `./paginationState` for exactly that, and the
   * space goes to the table). Omit and the bar always renders in full
   * ("0–0 of 0" over an empty table) — the stable-chrome default the verticals
   * that have not adopted this keep.
   */
  conditional?: boolean;
  /**
   * This pager SHARES its bar with other content — a detail view's status
   * footer, where it sits between the lifecycle stepper and the status
   * buttons instead of owning a band of its own (spec/ui-standards § tables →
   * pagination). It then sizes to its content rather than claiming the bar's
   * free space, so a crowded bar wraps the cluster whole instead of crushing
   * it. Omit in a table's own footer, where the pager IS the bar.
   */
  inBar?: boolean;
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
/*
 * The ellipsis that becomes a page box. Idle it is a "…" button standing for
 * the pages the window hides; pressed, it swaps to a small number input,
 * focused and ready to type. Enter jumps, Escape and blur put the ellipsis
 * back — so a mis-click costs nothing and the pager keeps its width either
 * way (the input is sized to the same slot).
 *
 * A button rather than a bare "…" because it IS the affordance for reaching a
 * hidden page; screen readers get the same offer, since the label says what
 * pressing it does rather than describing three dots.
 */
const PageJump = (props: { onJump: (page: number) => void; max: number }) => {
  const [editing, setEditing] = createSignal(false);
  let input: HTMLInputElement | undefined;

  const commit = () => {
    const page = Number(input?.value);
    setEditing(false);
    // Ignore an empty or non-numeric entry: nothing was asked for, so nothing
    // moves. goToPage clamps a number outside 1..max.
    if (Number.isFinite(page) && page > 0) props.onJump(page);
  };

  return (
    <Show
      when={editing()}
      fallback={
        <button
          type="button"
          class={`${styles.pageEllipsis} ${styles.numberSlot}`}
          data-testid="pagination-jump"
          aria-label={t('pagination.jump-to-page')}
          onClick={() => setEditing(true)}
        >
          …
        </button>
      }
    >
      <input
        ref={element => {
          input = element;
          // Focus once attached, so pressing the ellipsis lands the caret in
          // the box rather than making the user click twice.
          queueMicrotask(() => element.focus());
        }}
        class={`${styles.pageInput} ${styles.numberSlot}`}
        type="number"
        min="1"
        max={props.max}
        inputmode="numeric"
        data-testid="pagination-jump-input"
        aria-label={t('pagination.jump-to-page')}
        onKeyDown={event => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') setEditing(false);
        }}
        onBlur={() => setEditing(false)}
      />
    </Show>
  );
};

export const Pagination = (props: PaginationProps) => {
  const pageCount = () => Math.max(1, Math.ceil(props.total / props.pageSize));
  const currentPage = () => Math.floor(props.offset / props.pageSize) + 1; // 1-based
  const hasPrev = () => currentPage() > 1;
  const hasNext = () => currentPage() < pageCount();

  // The page list the spec asks for (ui-standards § tables → pagination):
  // 1 2 3 … 7 8 9 — the first page, a window around the current one, the last
  // page, with an ellipsis wherever the run breaks. Clicking an ellipsis turns
  // it into a number box (see below), which is how you reach a page the window
  // doesn't show without stepping there.
  //
  // Returns page numbers and 'gap' markers; a gap only appears where it stands
  // for MORE THAN ONE hidden page, since an ellipsis covering a single page
  // costs the same room as the page itself.
  const pageList = (): (number | 'gap')[] => {
    const total = pageCount();
    const current = currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out: (number | 'gap')[] = [1];
    const from = Math.max(2, current - 1);
    const to = Math.min(total - 1, current + 1);
    if (from > 2) out.push(from === 3 ? 2 : 'gap');
    for (let page = from; page <= to; page++) out.push(page);
    if (to < total - 1) out.push(to === total - 2 ? total - 1 : 'gap');
    out.push(total);
    return out;
  };

  const goToPage = (page: number) => {
    const clamped = Math.min(Math.max(1, page), pageCount());
    props.onOffsetChange((clamped - 1) * props.pageSize);
  };

  // Which face to show — read inside JSX (below) so a row-count change swaps
  // faces; a component body runs once, so an early `return` on this would
  // freeze the footer at its first state.
  const state = () => paginationState(props);

  return (
    <Show when={state() === 'full'}>
      {/* The bar. Under the stable-chrome default (no `conditional`) it renders
          at any row count, including zero ("0–0 of 0", pager disabled on its one
          page) as in the current app; a `conditional` host reaches it only with
          more than one page, and gets nothing at all below that. */}
      <nav
        class={`${styles.pagination} ${props.inBar ? styles.inBar : ''}`}
        aria-label={t('pagination.label')}
        data-testid="table-pagination"
      >
        {/* The pager: first · window around current · last, ellipses where the
            run breaks, prev/next at the ends and disabled at the boundaries.
            An ellipsis is a BUTTON — pressing it swaps in a number box, which
            is how a page outside the window is reached without stepping there
            (ui-standards § tables → pagination). */}
        <div class={styles.pager}>
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
          {/* Page position "1 / 8" — the narrow-screen stand-in for the number
              buttons, which hide when the bar is tight and would otherwise
              leave two bare arrows with no sense of where you are.
              aria-hidden: the range beside it already announces the position. */}
          <span class={styles.position} aria-hidden="true">
            {currentPage()} / {pageCount()}
          </span>
          <For each={pageList()}>
            {entry => (
              <Show
                when={entry !== 'gap'}
                fallback={<PageJump onJump={goToPage} max={pageCount()} />}
              >
                <Show
                  when={entry !== currentPage()}
                  fallback={
                    <span
                      class={`${styles.pageCurrent} ${styles.numberSlot}`}
                      data-testid="pagination-current-page"
                      aria-current="page"
                    >
                      {entry as number}
                    </span>
                  }
                >
                  <button
                    type="button"
                    class={`${styles.pageButton} ${styles.numberSlot}`}
                    onClick={() => goToPage(entry as number)}
                    data-testid={`pagination-page-${entry as number}`}
                    aria-label={t('pagination.go-to-page', {
                      page: entry as number,
                    })}
                  >
                    {entry as number}
                  </button>
                </Show>
              </Show>
            )}
          </For>
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
        </div>
      </nav>
    </Show>
  );
};
