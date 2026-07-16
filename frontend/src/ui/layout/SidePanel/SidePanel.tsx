import type { JSX } from 'solid-js';
import { t } from '../../../intl';
import { IconButton } from '../../elements/buttons/IconButton';
import { CloseIcon } from '../../icons';
import styles from './SidePanel.module.css';

export interface SidePanelProps {
  /**
   * The panel's title, shown in its header (and the aside's accessible name).
   */
  label?: string;
  /**
   * Closes the panel — renders the top-inline-end close button that flips the
   * page's open state.
   */
  onClose?: () => void;
  /** The panel's content — a stack of <SidePanelSection>s, page-owned. */
  children: JSX.Element;
}

/*
 * Details panel — the detail-view right-hand panel (the current app's
 * DetailPanel): additional info, related documents, comments. An OVERLAY
 * drawer pinned to the inline-end edge of the Page's middle region, floating
 * on top of the scrolling body (the CSS positions it; the page keeps the
 * open/close boolean in Page.sidePanelOpen and opens it from a header icon
 * button). Pure layout + look, no open state of its own: the page composes
 * <SidePanelSection>s, hands the panel to Page's `sidePanel` slot, and passes
 * `onClose` (→ the close button, top inline-end). Scrolls independently of the
 * body.
 */
export const SidePanel = (props: SidePanelProps) => (
  <aside class={styles.panel} aria-label={props.label ?? 'Details'}>
    <div class={styles.header}>
      <h2 class={styles.heading}>{props.label}</h2>
      {props.onClose && (
        <IconButton
          label={t('common.close')}
          icon={<CloseIcon />}
          onClick={props.onClose}
        />
      )}
    </div>
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
