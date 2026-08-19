import { children, Show, type JSX } from 'solid-js';
import { t } from '../../../intl';
import { IconButton } from '../../elements/buttons/IconButton';
import { CloseIcon } from '../../icons';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../elements/accordion/Accordion';
import { ALT_SHIFT_M } from '../../utils/shortcuts';
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
  /**
   * The panel element. `Page` binds a focus target here so that when the panel
   * takes over the viewport in overlay mode, focus moves INTO it rather than
   * staying parked behind the trap (spec/keyboard KB-X2).
   */
  ref?: (el: HTMLElement) => void;
}

/*
 * Details panel — the detail-view right-hand panel (the current app's
 * DetailPanel): additional info, related documents, comments. Pinned to the
 * inline-end edge of the Page's middle region; the Page frame owns how it
 * docks (a column that slides in and pushes the body at navOverlay and above,
 * an off-canvas drawer + scrim below it, with a drop shadow — see
 * Page.module.css). Pure layout + look, no open state of its own: the page
 * composes <SidePanelSection>s, hands the panel to Page's `sidePanel` slot,
 * and passes `onClose` (→ the close button, top inline-end). Scrolls
 * independently of the body.
 */
export const SidePanel = (props: SidePanelProps) => (
  <aside
    ref={el => props.ref?.(el)}
    class={styles.panel}
    // Programmatically focusable so Page can move focus into the panel when it
    // becomes an overlay; never a Tab stop of its own (KB-T1 allows only 0/-1).
    tabindex="-1"
    data-testid="detail-panel"
    aria-label={props.label ?? 'Details'}
  >
    <div class={styles.header}>
      <h2 class={styles.heading}>{props.label}</h2>
      {props.onClose && (
        <IconButton
          label={t('button.close')}
          icon={<CloseIcon />}
          // createSidePanelOpen (beside this file) registers Alt+Shift+M as
          // "hide the more-info panel"; this button is the control that
          // advertises it, the mirror of the app bar's More carrying Alt+M
          // (ui-surface S2 lists both sides of the pair).
          shortcut={ALT_SHIFT_M}
          onClick={props.onClose}
        />
      )}
    </div>
    {props.children}
  </aside>
);

export interface SidePanelSectionProps {
  /**
   * The section's semantic key (kebab-case identifier, never translated
   * copy), unique within its panel — stamped as the `panel-section-<value>`
   * testid, and the disclosure's identity when `collapsible`.
   */
  value: string;
  title: string;
  /**
   * Section content. Field rows are a plain <dl> of dt/dd pairs (styled by
   * the panel's CSS); free text is a <p>. Both stay semantic — no wrapper
   * components needed.
   */
  children: JSX.Element;
  /**
   * Make the section collapsible — the heading becomes the shared Accordion's
   * disclosure trigger, rendered identically to a plain heading (still an
   * <h2> for the outline).
   */
  collapsible?: boolean;
  /** Start expanded when collapsible. Default true. */
  defaultOpen?: boolean;
}

export const SidePanelSection = (props: SidePanelSectionProps) => {
  // Resolve the content once (kdd/solid-reactivity-pitfalls §3): it's read in
  // one of two mutually-exclusive branches below, memoised so toggling never
  // rebuilds it.
  const body = children(() => props.children);

  return (
    <section
      class={styles.section}
      // panel-section-<value> per e2e/TESTIDS.md: value lowercased,
      // spaces → '-' (the tab-<value> normalisation)
      data-testid={`panel-section-${props.value
        .toLowerCase()
        .replace(/\s+/g, '-')}`}
    >
      <Show
        when={props.collapsible}
        fallback={
          <>
            <h2 class={styles.title}>{props.title}</h2>
            {body()}
          </>
        }
      >
        <Accordion
          collapsible
          defaultValue={props.defaultOpen === false ? [] : [props.value]}
        >
          <AccordionItem value={props.value}>
            {/* The panel-convention classes strip the Accordion's own
                spacing so the heading/content boxes match a plain section's
                exactly — see SidePanel.module.css. */}
            <AccordionTrigger as="h2" class={styles.sectionTrigger}>
              {props.title}
            </AccordionTrigger>
            <AccordionContent class={styles.sectionContent}>
              {body()}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Show>
    </section>
  );
};

export interface SidePanelSubheadingProps {
  /** The sub-heading text — an `<h3>` within the section's `<h2>`. */
  children: JSX.Element;
  /**
   * An optional control pinned to the heading's inline-end — a group action
   * such as an Edit button (e.g. the Charges panel's Service-charges editor).
   */
  action?: JSX.Element;
}

/**
 * A sub-heading grouping fields within a SidePanelSection — the pricing-group
 * headings inside a shipment's Charges panel ("Stock charges", "Service
 * charges"). A bold `<h3>` under the section's `<h2>`, with a gap below
 * separating it from its group's rows; an optional `action` pins to the
 * inline-end (centred against the heading).
 */
export const SidePanelSubheading = (props: SidePanelSubheadingProps) => (
  <div class={styles.subheading}>
    <h3 class={styles.subheadingTitle}>{props.children}</h3>
    {props.action}
  </div>
);

/**
 * The record-actions cluster inside a panel section (the registry's
 * record-actions section): one action per row, aligned inline-start, each
 * button sized to its label. Compose it inside the panel's last section
 * (`value="actions"`, titled `heading.actions`) — the panel pins the section
 * containing this cluster at its end.
 */
export const SidePanelActions = (props: { children: JSX.Element }) => (
  <div class={styles.actions}>{props.children}</div>
);
