import type { JSX } from 'solid-js'
import styles from './ContentFooter.module.css'

export interface ContentFooterProps {
  /**
   * The bar's content, page-owned like Header's: loose children flow from
   * the inline-start edge; wrap the action buttons in <ContentFooterActions>
   * to pin them inline-end. The content is contextual by composition — a
   * page swaps its children (detail actions ↔ selection actions) rather
   * than the layout knowing about selection.
   */
  children?: JSX.Element
}

/*
 * Content footer — the pinned action bar between a page's scrolling body and
 * the orange app footer (the current app's blue-buttons bar: History / Cancel
 * / Save on a detail page, "N selected" + actions when a table has a
 * selection). Pure layout, zero state — the same contract as Header: one flat
 * flex-wrap strip, the page composes the content and owns every handler, and
 * ContentFooterActions slots itself inline-end via its own CSS. Pass the
 * composed bar to the Page frame's `contentFooter` slot so it pins below the
 * scroll region. A plain <div>, not <footer> — the shell's
 * orange bar is the page's one footer landmark; this is an action strip.
 * Adapted from the RnD prototype's ContentFooter, minus its selection store:
 * contextual content is the page's job (see kdd/page-composition).
 */
export const ContentFooter = (props: ContentFooterProps) => (
  <div class={styles.footer}>{props.children}</div>
)
