import { Show } from 'solid-js'
import { ArrowRightIcon } from '../../icons'
import styles from './Pagination.module.css'

export interface PaginationProps {
  /** Zero-based row offset of the current page. */
  offset: number
  /** Rows per page. */
  pageSize: number
  /** Total matching rows (across all pages). */
  total: number
  /** Requests a new offset — the parent owns the page state (URL params). */
  onOffsetChange: (offset: number) => void
}

/*
 * List pagination — a compact "M–N of T" range with previous/next controls.
 * Hand-rolled: the buttons are native <button>s (role + keyboard + disabled for
 * free); the label is a live region so a screen reader hears the page change.
 * The parent owns offset/pageSize (destined for URL params); this component is
 * pure presentation over them. The next/prev arrows reuse ArrowRightIcon
 * (rotated 180° for previous); RTL mirroring of the pair is a follow-up.
 */
export const Pagination = (props: PaginationProps) => {
  const from = () => (props.total === 0 ? 0 : props.offset + 1)
  const to = () => Math.min(props.offset + props.pageSize, props.total)
  const hasPrev = () => props.offset > 0
  const hasNext = () => props.offset + props.pageSize < props.total

  const prev = () => props.onOffsetChange(Math.max(0, props.offset - props.pageSize))
  const next = () => props.onOffsetChange(props.offset + props.pageSize)

  return (
    <Show when={props.total > 0}>
      <nav class={styles.pagination} aria-label="Pagination">
        <span class={styles.range} aria-live="polite">
          {from()}–{to()} of {props.total}
        </span>
        <div class={styles.controls}>
          <button
            type="button"
            class={styles.button}
            onClick={prev}
            disabled={!hasPrev()}
            aria-label="Previous page"
          >
            <ArrowRightIcon class={styles.prevIcon} />
          </button>
          <button
            type="button"
            class={styles.button}
            onClick={next}
            disabled={!hasNext()}
            aria-label="Next page"
          >
            <ArrowRightIcon />
          </button>
        </div>
      </nav>
    </Show>
  )
}
