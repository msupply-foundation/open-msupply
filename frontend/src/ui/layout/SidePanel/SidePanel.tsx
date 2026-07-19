import {
  children,
  createSignal,
  createUniqueId,
  Show,
  type JSX,
} from 'solid-js';
import { t } from '../../../intl';
import { IconButton } from '../../elements/buttons/IconButton';
import { ChevronDownIcon, CloseIcon } from '../../icons';
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
  <aside
    class={styles.panel}
    data-testid="detail-panel"
    aria-label={props.label ?? 'Details'}
  >
    <div class={styles.header}>
      <h2 class={styles.heading}>{props.label}</h2>
      {props.onClose && (
        <IconButton
          label={t('button.close')}
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
  /**
   * Make the section collapsible: the heading becomes a disclosure button
   * (with a rotating chevron) that shows/hides the content. The heading stays
   * an <h2> for the document outline. Default (omitted) renders the plain,
   * always-open section — unchanged for existing callers.
   */
  collapsible?: boolean;
  /** Start expanded when collapsible. Default true. */
  defaultOpen?: boolean;
}

export const SidePanelSection = (props: SidePanelSectionProps) => {
  const [open, setOpen] = createSignal(props.defaultOpen ?? true);
  const contentId = createUniqueId();
  // Resolve the content once (kdd/solid-reactivity-pitfalls §3): it's read in
  // one of two mutually-exclusive branches below, memoised so toggling never
  // rebuilds it.
  const body = children(() => props.children);

  return (
    <section class={styles.section}>
      <Show
        when={props.collapsible}
        fallback={<h2 class={styles.title}>{props.title}</h2>}
      >
        <h2 class={styles.title}>
          <button
            type="button"
            class={styles.disclosure}
            aria-expanded={open()}
            aria-controls={contentId}
            onClick={() => setOpen(o => !o)}
          >
            <span>{props.title}</span>
            <ChevronDownIcon
              class={styles.disclosureChevron}
              data-open={open() ? 'true' : 'false'}
              aria-hidden="true"
            />
          </button>
        </h2>
      </Show>
      <Show
        when={!props.collapsible}
        fallback={
          <Show when={open()}>
            <div id={contentId}>{body()}</div>
          </Show>
        }
      >
        {body()}
      </Show>
    </section>
  );
};
