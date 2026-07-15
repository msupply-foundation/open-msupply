import type { JSX } from 'solid-js';
import styles from './SidePanel.module.css';

export interface SidePanelProps {
  /** Accessible name for the aside landmark. */
  label?: string;
  /** The panel's content — a stack of <SidePanelSection>s, page-owned. */
  children: JSX.Element;
}

/*
 * Side panel — the detail-view right-hand panel (the current app's
 * DetailPanel): related documents, additional info, comments. Pure layout,
 * zero state — the same contract as Header/ContentFooter: the page composes
 * <SidePanelSection>s and hands the panel to Page's `sidePanel` slot, which
 * docks it inline-end beside the scrolling body. The panel scrolls
 * independently of the body.
 *
 * KNOWN GAP (skeleton stage): below the nav-overlay breakpoint the docked
 * panel simply doesn't render (a which-element media decision in the CSS) —
 * the current app opens it as a toggled overlay drawer from an AppBar button
 * instead. That toggle needs a Drawer, which arrives with the Feedback work;
 * until then panel content is unreachable on narrow viewports. See
 * kdd/page-composition.
 */
export const SidePanel = (props: SidePanelProps) => (
  <aside
    class={styles.panel}
    data-testid="detail-panel"
    aria-label={props.label ?? 'Details'}
  >
    {props.children}
  </aside>
);

export interface SidePanelSectionProps {
  title: string;
  /**
   * Section content. Field rows are a plain <dl> of dt/dd pairs (styled by
   * the panel's CSS); free text is a <p>. Both stay semantic — no wrapper
   * components needed.
   */
  children: JSX.Element;
}

export const SidePanelSection = (props: SidePanelSectionProps) => (
  <section class={styles.section}>
    <h2 class={styles.title}>{props.title}</h2>
    {props.children}
  </section>
);
