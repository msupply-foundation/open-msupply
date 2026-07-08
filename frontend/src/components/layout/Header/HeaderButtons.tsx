import type { JSX } from 'solid-js'
import styles from './HeaderButtons.module.css'

export interface HeaderButtonsProps {
  /** The page's actions — library Button / SplitButton instances. */
  children: JSX.Element
}

/*
 * HeaderButtons — the page-action cluster at the header's inline-end (the
 * current app's AppBarButtons slot). A pure layout group: the page owns the
 * buttons and their handlers. Pins itself to the end edge with an auto
 * margin, so it lands correctly even with no breadcrumb beside it, and hugs
 * the same edge when it wraps onto its own line.
 */
export const HeaderButtons = (props: HeaderButtonsProps) => (
  <div class={styles.buttons}>{props.children}</div>
)
