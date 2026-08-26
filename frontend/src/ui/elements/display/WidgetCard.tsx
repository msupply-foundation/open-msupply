import {
  children,
  createEffect,
  createUniqueId,
  Show,
  type JSX,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import styles from './WidgetCard.module.css';

export interface WidgetCardProps {
  /** The card's title — its primary text and accessible name. */
  title: string;
  subtitle?: string;
  /** Optional leading icon (an SVG icon element). */
  icon?: JSX.Element;
  /**
   * Navigate on click — renders the card as an <a href>. @solidjs/router
   * intercepts local anchor clicks, so this participates in client routing.
   * Mutually exclusive with onClick (href wins).
   */
  href?: string;
  /** Act on click — renders the card as a <button>. */
  onClick?: () => void;
  /**
   * Optional content, rendered full-width after the icon + title/subtitle
   * header. The card is ONE interactive element (<a>/<button>), so children
   * must be non-interactive — figures, chips, text — never links or buttons
   * (nested interactives are invalid HTML and an a11y trap; dev builds warn).
   * Phrasing content only (<span>, text): a <div>/<p> is invalid inside the
   * <button> variant. Slot text is the control's accessible DESCRIPTION, not
   * part of its name (see the component note).
   */
  children?: JSX.Element;
  class?: string;
  testId?: string;
}

/* Interactive descendants the slot must never hold — the card is already the
 * interactive element. */
const INTERACTIVE = 'a, button, input, select, textarea, [tabindex]';

/*
 * WidgetCard — a clickable titled card for dashboard grids. The WHOLE card is a
 * single interactive element: an <a> when given `href` (router navigation) or a
 * <button> when given `onClick`. Either way it's one focusable control with the
 * header text (title + subtitle) as its accessible name (the icon is
 * decorative / aria-hidden), so there's no nested-interactive trap and
 * keyboard/Enter/Space + focus come from the native element — nothing to buy.
 * Hover + focus-visible lift it per the tokens. rem/em sizing, colours from
 * tokens.
 *
 * The optional content slot renders full-width after the header —
 * non-interactive children only (see WidgetCardProps). Slot text joins the
 * control's accessible DESCRIPTION, never its name: the slot span is
 * aria-hidden where it sits (a live KPI must not rename the control under a
 * screen-reader user, and name locators stay stable) and re-enters through
 * aria-describedby, which includes hidden referenced nodes by the accessible
 * name computation — announced after the name, as description.
 */
export const WidgetCard = (props: WidgetCardProps) => {
  // JSX-element props read in two places (guard + insert) — resolve once
  // (kdd/solid-reactivity-pitfalls §3).
  const icon = children(() => props.icon);
  const content = children(() => props.children);
  const isLink = () => props.href !== undefined;
  // 0 is a real KPI value, so the slot gates on "resolves to renderable
  // content" — nullish / boolean / '' (all of which Solid renders as nothing)
  // — never on truthiness, which would eat a count of 0.
  const hasContent = () => {
    const c = content();
    return c != null && c !== '' && typeof c !== 'boolean';
  };
  const contentId = createUniqueId();

  if (import.meta.env.DEV) {
    // The non-interactive-children contract can't be reviewed across the
    // plugin boundary (the SDK exports this card), so dev builds check the
    // rendered slot — the Dialog footer check's pattern.
    let warned = false;
    createEffect(() => {
      if (warned) return;
      for (const node of content.toArray()) {
        if (!(node instanceof Element)) continue;
        const bad = node.matches(INTERACTIVE)
          ? node
          : node.querySelector(INTERACTIVE);
        if (bad) {
          warned = true;
          console.warn(
            `WidgetCard ("${props.title}"): the content slot holds an interactive <${bad.tagName.toLowerCase()}> nested inside the card's own <a>/<button> — invalid HTML and a keyboard/AT trap. Slot children must be non-interactive (figures, chips, text).`
          );
          return;
        }
      }
    });
  }

  return (
    <Dynamic
      component={isLink() ? 'a' : 'button'}
      class={props.class ? `${styles.card} ${props.class}` : styles.card}
      href={isLink() ? props.href : undefined}
      type={isLink() ? undefined : 'button'}
      onClick={isLink() ? undefined : () => props.onClick?.()}
      aria-describedby={hasContent() ? contentId : undefined}
      data-testid={props.testId}
    >
      <span class={styles.header}>
        <Show when={icon()}>
          <span class={styles.icon} aria-hidden="true">
            {icon()}
          </span>
        </Show>
        <span class={styles.text}>
          <span class={styles.title}>{props.title}</span>
          <Show when={props.subtitle}>
            <span class={styles.subtitle}>{props.subtitle}</span>
          </Show>
        </span>
      </span>
      <Show when={hasContent()}>
        <span class={styles.content} id={contentId} aria-hidden="true">
          {content()}
        </span>
      </Show>
    </Dynamic>
  );
};
