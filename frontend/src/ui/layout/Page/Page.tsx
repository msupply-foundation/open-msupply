import { children, createEffect, onCleanup, Show, type JSX } from 'solid-js';
import { useFullScreen, useShellOverlay } from '../AppShell/shellContext';
import { createFocusTarget } from '../../utils/createFocusTarget';
import { useIsNavOverlay } from '../../utils/createMediaQuery';
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
   * supplies only what goes INSIDE, not the panel chrome. At navOverlay and
   * above it's a DOCKED column at the inline-end: opening it slides the column
   * in and PUSHES the body (so the app bar's action buttons stay uncovered),
   * with a drop shadow. Below navOverlay it's an off-canvas drawer that slides
   * OVER the page behind a scrim. Omit on pages without a panel.
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
  // Resolve the JSX-element prop ONCE (kdd/solid-reactivity-pitfalls §3): it's
  // read both by the <Show> test and the insertion below, and each raw access
  // of a JSX prop getter builds a brand-new subtree — the test's copy would be
  // discarded but still executed (doubled onMounts/refs, live computations on
  // detached DOM). children() memoizes so both reads share one instance.
  const panelContent = children(() => props.sidePanelContent);

  // Below the navOverlay breakpoint the OPEN panel is an off-canvas drawer that
  // slides OVER the page behind a scrim, mirroring the nav drawer on the
  // opposite edge (Page.module.css, spec ui-standards/layout.md → page regions,
  // D27) — so narrow content is never squeezed to a sliver. While it's active
  // the covered main column is `inert` (unreachable by keyboard and assistive
  // tech — it isn't a full dialog yet, so without this focus could tab into the
  // hidden content) and Esc closes the panel.
  const isNavOverlay = useIsNavOverlay();
  const overlayActive = () =>
    isNavOverlay() && props.sidePanelOpen === true && !!panelContent();

  /*
   * Tell the shell to make everything outside the panel inert while it covers
   * the viewport (spec/keyboard KB-X2/AC-KB17). The `inert` on `.main` below is
   * all a Page can reach on its own — MenuBar and the app footer render OUTSIDE
   * the Page — so without this, Tab from an open panel walked straight into the
   * nav, the theme toggle, the language selector and sync.
   */
  const shellOverlay = useShellOverlay();
  createEffect(() => shellOverlay?.setPanelOverlay(overlayActive()));
  // Leaving the page while the panel is open must not strand the shell inert.
  onCleanup(() => shellOverlay?.setPanelOverlay(false));

  // Focus moves INTO the panel when it takes over, so the keyboard is inside the
  // trap rather than parked behind it, and the Escape rung below can see the key.
  const panelFocus = createFocusTarget();
  createEffect(() => {
    if (overlayActive()) panelFocus.focus();
  });

  return (
    // Top level is a ROW: the main column (header / body / footer) beside the
    // details panel, so the panel spans the WHOLE page height (alongside the
    // header and footer too), pushing all of them when it opens — not just the
    // body band.
    <div class={styles.page}>
      <div class={styles.main} inert={overlayActive()}>
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
      {/* Details panel, baked into the frame: full page height, MOUNTED while content is
          provided and merely PARKED off-frame while closed — open/close never remounts the
          content (kdd/state-management: no remounts), and panel state (scroll, in-progress
          edits) survives. Docked (pushes the body) at navOverlay and above; an off-canvas
          drawer + scrim below it. The frame owns the SidePanel chrome (header, title,
          close); the page supplies only the content + title + the open boolean. */}
      <Show when={panelContent()}>
        <>
          {/* Overlay-mode scrim (CSS hides it while docked): dims the covered
              content and closes the panel on tap. */}
          <div
            class={styles.scrim}
            data-open={props.sidePanelOpen === true ? 'true' : undefined}
            aria-hidden="true"
            onClick={() => props.onSidePanelClose?.()}
          />
          <div
            class={styles.panelSlot}
            data-closed={props.sidePanelOpen === false ? '' : undefined}
            /*
             * KB-X2's Escape rung. `on:keydown` (a REAL listener on this
             * element), not `onKeyDown`: Solid delegates keydown at `document`,
             * so a delegated handler runs after the event already passed there
             * and could not stop our window-level tail or Kobalte.
             *
             * That is what the old `document`-level listener got wrong, twice: a
             * dialog's stopPropagation could not stop it (so Escape inside any
             * dialog ALSO closed the panel), and it ran before Kobalte's own
             * listener (so Escape closing a Select inside the panel closed the
             * panel too).
             *
             * preventDefault AND stopPropagation, because stopPropagation alone
             * does not CONSUME Escape — the window tail bails on
             * `defaultPrevented`, and a rung that only stopped propagation would
             * let navigate-up fire from a nested surface.
             *
             * Overlay mode only: a docked panel is not modal and must not swallow
             * Escape from the screen beside it.
             */
            on:keydown={event => {
              if (event.key !== 'Escape' || !overlayActive()) return;
              event.preventDefault();
              event.stopPropagation();
              props.onSidePanelClose?.();
            }}
          >
            <SidePanel
              ref={panelFocus.ref}
              label={props.sidePanelTitle}
              onClose={props.onSidePanelClose}
            >
              {panelContent()}
            </SidePanel>
          </div>
        </>
      </Show>
    </div>
  );
};
