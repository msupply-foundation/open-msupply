import { children, Show, type JSX } from 'solid-js';
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
   * (nested interactives are invalid HTML and an a11y trap).
   */
  children?: JSX.Element;
  class?: string;
  testId?: string;
}

/*
 * WidgetCard — a clickable titled card for dashboard grids. The WHOLE card is a
 * single interactive element: an <a> when given `href` (router navigation) or a
 * <button> when given `onClick`. Either way it's one focusable control with the
 * title as its accessible name (the icon is decorative / aria-hidden), so
 * there's no nested-interactive trap and keyboard/Enter/Space + focus come from
 * the native element — nothing to buy. Hover + focus-visible lift it per the
 * tokens. rem/em sizing, colours from tokens. An optional content slot renders
 * full-width after the icon + title/subtitle header — non-interactive children
 * only (see WidgetCardProps).
 */
export const WidgetCard = (props: WidgetCardProps) => {
  // JSX-element props read in two places (guard + insert) — resolve once
  // (kdd/solid-reactivity-pitfalls §3).
  const icon = children(() => props.icon);
  const content = children(() => props.children);
  const isLink = () => props.href !== undefined;

  return (
    <Dynamic
      component={isLink() ? 'a' : 'button'}
      class={props.class ? `${styles.card} ${props.class}` : styles.card}
      href={isLink() ? props.href : undefined}
      type={isLink() ? undefined : 'button'}
      onClick={isLink() ? undefined : () => props.onClick?.()}
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
      <Show when={content()}>
        <span class={styles.content}>{content()}</span>
      </Show>
    </Dynamic>
  );
};
