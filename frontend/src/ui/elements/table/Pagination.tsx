import { For, Show } from 'solid-js';
import {
  FirstPageIcon,
  LastPageIcon,
  NavigateBeforeIcon,
  NavigateNextIcon,
} from '../../icons';
import { Select } from '../selectors/Select';
import { t } from '../../../intl';
import styles from './Pagination.module.css';

const DEFAULT_PAGE_SIZES = [20, 50, 100];

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
}

/*
 * List pagination, styled to match the current Open mSupply app: a "Showing
 * X-Y of Z" summary on the inline-start edge, then a rows-per-page selector
 * and a numbered page pager (first / previous / 1 2 3 … N / next / last) on
 * the inline-end edge (spec/ui-standards/tables › pagination).
 *
 * Hand-rolled over native <button>s (role + keyboard + disabled for free); the
 * summary is a live region so a screen reader hears the page change. The
 * parent owns offset/pageSize (destined for URL params); this component is
 * pure presentation over them. The pager arrows (first / prev / next / last)
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

  const goToPage = (page: number) => {
    const clamped = Math.min(Math.max(1, page), pageCount());
    props.onOffsetChange((clamped - 1) * props.pageSize);
  };

  // The page numbers to show, with ellipsis gaps. Always show first + last;
  // show a window of pages around the current one. Gaps are the literal '…'
  // (not a page). Mirrors the MRT pager OMS renders: e.g. 1 2 3 4 5 … 21, or 1
  // … 9 10 11 … 21.
  const pageItems = (): (number | 'gap-start' | 'gap-end')[] => {
    const count = pageCount();
    const current = currentPage();
    if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
    const items: (number | 'gap-start' | 'gap-end')[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(count - 1, current + 1);
    if (start > 2) items.push('gap-start');
    for (let p = start; p <= end; p++) items.push(p);
    if (end < count - 1) items.push('gap-end');
    items.push(count);
    return items;
  };

  return (
    // Rendered even at zero rows ("Showing 0-0 of 0", pager disabled on its
    // one page) — the footer is part of the list's stable chrome, as in the
    // current app; an appearing/disappearing bar would shift the layout on
    // every filter.
    <nav class={styles.pagination} aria-label={t('pagination.label')}>
      {/* "Showing X-Y of Z" — the range and total are emphasised (bold), the words
          are not, matching the current app's Showing/of split. */}
      <span class={styles.summary} aria-live="polite">
        {t('pagination.showing')}{' '}
        <strong class={styles.summaryNumber}>
          {from()}-{to()}
        </strong>{' '}
        {t('pagination.of')}{' '}
        <strong class={styles.summaryNumber}>{props.total}</strong>
      </span>
      <div class={styles.controls}>
        <Show when={props.onPageSizeChange}>
          <Select
            class={styles.pageSize}
            size="sm"
            label={t('pagination.rows')}
            value={String(props.pageSize)}
            options={pageSizes().map(size => ({
              value: String(size),
              label: String(size),
            }))}
            onValueChange={v => props.onPageSizeChange!(Number(v))}
          />
        </Show>
        <div class={styles.pager}>
          <button
            type="button"
            class={styles.pageButton}
            onClick={() => goToPage(1)}
            disabled={!hasPrev()}
            aria-label={t('pagination.first')}
          >
            <FirstPageIcon />
          </button>
          <button
            type="button"
            class={styles.pageButton}
            onClick={() => goToPage(currentPage() - 1)}
            disabled={!hasPrev()}
            aria-label={t('pagination.previous')}
          >
            <NavigateBeforeIcon />
          </button>
          <For each={pageItems()}>
            {item => (
              <Show
                when={typeof item === 'number'}
                fallback={<span class={styles.gap}>…</span>}
              >
                <button
                  type="button"
                  class={`${styles.pageButton} ${item === currentPage() ? styles.pageButtonActive : ''}`}
                  aria-label={t('pagination.go-to-page', {
                    page: item as number,
                  })}
                  aria-current={item === currentPage() ? 'page' : undefined}
                  onClick={() => goToPage(item as number)}
                >
                  {item as number}
                </button>
              </Show>
            )}
          </For>
          <button
            type="button"
            class={styles.pageButton}
            onClick={() => goToPage(currentPage() + 1)}
            disabled={!hasNext()}
            aria-label={t('pagination.next')}
          >
            <NavigateNextIcon />
          </button>
          <button
            type="button"
            class={styles.pageButton}
            onClick={() => goToPage(pageCount())}
            disabled={!hasNext()}
            aria-label={t('pagination.last')}
          >
            <LastPageIcon />
          </button>
        </div>
      </div>
    </nav>
  );
};
