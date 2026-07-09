import { For, Show } from 'solid-js'
import { ArrowRightIcon } from '../../icons'
import { t } from '../../../intl'
import styles from './Pagination.module.css'

const DEFAULT_PAGE_SIZES = [20, 50, 100]

export interface PaginationProps {
  /** Zero-based row offset of the current page. */
  offset: number
  /** Rows per page. */
  pageSize: number
  /** Total matching rows (across all pages). */
  total: number
  /** Requests a new offset — the parent owns the page state (URL params). */
  onOffsetChange: (offset: number) => void
  /** Requests a new page size. When given, a rows-per-page selector is shown; the
   *  parent resets to the first page on change. Omit to hide the selector. */
  onPageSizeChange?: (pageSize: number) => void
  /** Selectable rows-per-page options (default 20 / 50 / 100). */
  pageSizes?: number[]
}

/*
 * List pagination — a compact "M–N of T" range, an optional rows-per-page
 * selector, and previous/next controls (spec/ui-standards/tables › pagination).
 * Hand-rolled: the buttons are native <button>s (role + keyboard + disabled for
 * free); the label is a live region so a screen reader hears the page change.
 * The parent owns offset/pageSize (destined for URL params); this component is
 * pure presentation over them. The next/prev arrows reuse ArrowRightIcon
 * (rotated 180° for previous); RTL mirroring of the pair is a follow-up.
 *
 * NOTE the spec also calls for numbered page options ("1 2 3 … 7 8 9"); that
 * affordance is not yet designed, so only range + prev/next ship here.
 */
export const Pagination = (props: PaginationProps) => {
  const from = () => (props.total === 0 ? 0 : props.offset + 1)
  const to = () => Math.min(props.offset + props.pageSize, props.total)
  const hasPrev = () => props.offset > 0
  const hasNext = () => props.offset + props.pageSize < props.total
  const pageSizes = () => props.pageSizes ?? DEFAULT_PAGE_SIZES

  const prev = () => props.onOffsetChange(Math.max(0, props.offset - props.pageSize))
  const next = () => props.onOffsetChange(props.offset + props.pageSize)

  return (
    <Show when={props.total > 0}>
      <nav class={styles.pagination} aria-label={t('pagination.label')}>
        <span class={styles.range} aria-live="polite">
          {t('pagination.range', { from: from(), to: to(), total: props.total })}
        </span>
        <Show when={props.onPageSizeChange}>
          <label class={styles.pageSize}>
            {t('pagination.rows')}
            <select
              value={String(props.pageSize)}
              onChange={(e) => props.onPageSizeChange!(Number(e.currentTarget.value))}
            >
              <For each={pageSizes()}>{(size) => <option value={size}>{size}</option>}</For>
            </select>
          </label>
        </Show>
        <div class={styles.controls}>
          <button
            type="button"
            class={styles.button}
            onClick={prev}
            disabled={!hasPrev()}
            aria-label={t('pagination.previous')}
          >
            <ArrowRightIcon class={styles.prevIcon} />
          </button>
          <button
            type="button"
            class={styles.button}
            onClick={next}
            disabled={!hasNext()}
            aria-label={t('pagination.next')}
          >
            <ArrowRightIcon />
          </button>
        </div>
      </nav>
    </Show>
  )
}
