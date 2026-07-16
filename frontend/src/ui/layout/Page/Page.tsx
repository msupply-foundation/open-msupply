import { Show, type JSX } from 'solid-js';
import { useFullScreen } from '../AppShell/shellContext';
import styles from './Page.module.css';

export interface PageProps {
  /**
   * The page's header — a composed <Header>…</Header>. The frame pins it
   * above the scrolling body. Inside an AppShell, always provide one: in
   * overlay mode the hamburger that opens the nav renders inside it (via
   * ShellNavContext), so a page without a header has no way into the menu
   * on narrow viewports.
   */
  header?: JSX.Element;
  /**
   * The page's pinned action bar — a composed <ContentFooter>…</ContentFooter>
   * (or a <Show> around one, for bars that only exist contextually, e.g. with
   * a table selection). Pinned below the scrolling body; never scrolls.
   */
  contentFooter?: JSX.Element;
  /**
   * The docked details panel — a composed <SidePanel>…</SidePanel>, docked
   * inline-end beside the body with its own scroll, spanning from below the
   * header to above the content footer. Omit it on pages without one (list
   * views); the body then takes the full width.
   */
  sidePanel?: JSX.Element;
  /** Page body, rendered in the scrolling region. */
  children: JSX.Element;
  /**
   * Fill mode: the body becomes a non-scrolling flex column with no padding,
   * so a single child that manages its own scroll (e.g. the DataTable, which
   * fills the space and scrolls internally with sticky headers) claims the
   * full region. Default (false) is the normal scrolling-body behaviour, where
   * the body itself scrolls its content.
   */
  fillBody?: boolean;
}

/*
 * Page — the page frame, and the geometry contract every list/detail-style
 * page shares: pinned header on top, scrolling body, optional side panel
 * docked inline-end, optional pinned content footer below. GEOMETRY ONLY —
 * the frame owns where regions sit and the spacing between them, and carries
 * zero opinion about what's inside; each slot takes a page-composed region
 * component (Header family, ContentFooter, SidePanel), and variation between
 * pages lives entirely within those. Optional slots simply collapse, so a
 * list view (no side panel) and a detail view (side panel) are the same
 * frame, not two templates.
 *
 * Fills its container: inside an AppShell it stretches to the full space
 * between menu bar and app footer (the shell's content slot is a flex
 * column). The scrolling stays in the body region — header, panel and
 * footer never move. Pages compose this frame but own NO CSS of their own
 * (enforced by scripts/check-page-css.mjs) — see kdd/page-composition.
 */
export const Page = (props: PageProps) => {
  // In shell full-screen mode the page header hides too (only content + footer
  // remain), matching Open mSupply. Outside a shell (no provider)
  // useFullScreen() is undefined, so the header always shows there.
  const fullScreen = useFullScreen();
  return (
    <div class={styles.page}>
      <Show when={!fullScreen?.isFullScreen()}>{props.header}</Show>
      <div class={styles.middle}>
        <div class={`${styles.body} ${props.fillBody ? styles.bodyFill : ''}`}>
          {props.children}
        </div>
        {props.sidePanel}
      </div>
      {props.contentFooter}
    </div>
  );
};
