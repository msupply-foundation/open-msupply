import { Show, type JSX } from 'solid-js';
import { useFullScreen } from '../AppShell/shellContext';
import { SidePanel } from '../SidePanel/SidePanel';
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
   * The details-panel CONTENT — a stack of <SidePanelSection>s (or any
   * markup). The PANEL ITSELF (the docked frame, its header with the title,
   * and the close button) is baked into the frame here — a detail view
   * supplies only what goes INSIDE, not the panel chrome. A DOCKED column at
   * the inline-end of the body: while `sidePanelOpen` it takes its width and
   * PUSHES the body (shrinks it), rather than floating over it. Omit on pages
   * without a panel.
   */
  sidePanelContent?: JSX.Element;
  /** The panel's title (header text + accessible name). */
  sidePanelTitle?: string;
  /**
   * Whether the panel is shown. Set from a page-owned signal + a header toggle
   * button to make the panel openable (as in Open mSupply's details button).
   * The page owns just the boolean; the frame owns the panel chrome (header,
   * close button, docking geometry).
   */
  sidePanelOpen?: boolean;
  /**
   * Called by the panel's own close button (top inline-end) — flip the page's
   * open signal here.
   */
  onSidePanelClose?: () => void;
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
    // Top level is a ROW: the main column (header / body / footer) beside the
    // details panel, so the panel spans the WHOLE page height (alongside the
    // header and footer too), pushing all of them when it opens — not just the
    // body band.
    <div class={styles.page}>
      <div class={styles.main}>
        <Show when={!fullScreen?.isFullScreen()}>{props.header}</Show>
        <div class={styles.middle}>
          <div
            class={`${styles.body} ${props.fillBody ? styles.bodyFill : ''}`}
          >
            {props.children}
          </div>
        </div>
        {props.contentFooter}
      </div>
      {/* Details panel, baked into the frame: full page height, shown while content is provided
          AND open. The frame owns the SidePanel chrome (header, title, close); the page supplies
          only the content + title + the open boolean. */}
      <Show when={props.sidePanelContent && props.sidePanelOpen !== false}>
        <SidePanel
          label={props.sidePanelTitle}
          onClose={props.onSidePanelClose}
        >
          {props.sidePanelContent}
        </SidePanel>
      </Show>
    </div>
  );
};
