import { Show } from 'solid-js';
import { modifierHeld } from '../../utils/modifierHint';
import { shortcutLabel, type Shortcut } from '../../utils/shortcuts';
import styles from './ShortcutBadge.module.css';

/*
 * The modifier hint (spec/keyboard KB-H1, ui-surface S2): while Alt or Ctrl is
 * held, every control carrying a shortcut reveals it as a badge; releasing hides
 * them again. The discoverability path for a user already looking at the
 * control, alongside the palette's for a user browsing.
 *
 * It takes the SHORTCUT VALUE, never a string. That is what makes AC-KB15 — "it
 * MUST be driven by the same declared shortcut the control exposes to assistive
 * technology, never a second, hand-maintained copy that can drift" — a property
 * of the types rather than a rule: the badge and the control's
 * `aria-keyshortcuts` render from one object (see Button).
 *
 * aria-hidden: the shortcut is already on the carrier as `aria-keyshortcuts`,
 * which is how assistive technology is meant to learn it. Exposing the badge
 * text too would announce the same binding twice.
 */

export interface ShortcutBadgeProps {
  shortcut: Shortcut;
  /**
   * A carrier-owned placement override — the badge's default corner does not
   * suit every control (an icon-only button is narrower than a key legend, so
   * IconButton moves it below the box). Scope it under the carrier's own class
   * so it beats this module's single-class insets whichever order the two style
   * sheets land in.
   */
  class?: string;
}

export const ShortcutBadge = (props: ShortcutBadgeProps) => (
  <Show when={modifierHeld()}>
    <span
      class={props.class ? `${styles.badge} ${props.class}` : styles.badge}
      aria-hidden="true"
    >
      {shortcutLabel(props.shortcut)}
    </span>
  </Show>
);
