import type { JSX } from 'solid-js'
import styles from './Toolbar.module.css'

export interface ToolbarProps {
  /** Per-page toolbar content (filters, tabs, totals…). The page owns it all. */
  children?: JSX.Element
}

/*
 * Toolbar — the full-width row under the breadcrumb/buttons (the current
 * app's AppBarContent slot). Deliberately a plain <div>, NOT role="toolbar":
 * that ARIA role demands arrow-key roving focus between controls, which
 * would be wrong for a loose strip of filters. Content is fully page-owned;
 * this component only claims the row.
 */
export const Toolbar = (props: ToolbarProps) => (
  <div class={styles.toolbar}>{props.children}</div>
)
