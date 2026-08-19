import { Show, splitProps, type JSX } from 'solid-js';
import { ShortcutBadge } from '../keyboard/ShortcutBadge';
import { ariaKeyshortcuts, type Shortcut } from '../../utils/shortcuts';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  /** The icon to show (an SVG icon element). */
  icon: JSX.Element;
  /**
   * Accessible name — REQUIRED, because there's no visible text. Also used as
   * the title (hover tooltip).
   */
  label: string;
  /**
   * Semantic tone (maps to palette tokens in the CSS): 'neutral' (default),
   * 'danger'.
   */
  variant?: 'neutral' | 'danger';
  /**
   * Draw a border around the button (an outlined control) rather than a bare
   * icon.
   */
  bordered?: boolean;
  /** Size: 'small' (dense, e.g. a table row action) or 'medium' (default). */
  size?: 'small' | 'medium';
  /**
   * The key binding this button answers (spec/keyboard KB-H1, S2) — the same
   * ONE prop `Button` takes, driving both `aria-keyshortcuts` and the hint
   * badge revealed while Alt or Ctrl is held, so the two cannot drift
   * (AC-KB15).
   *
   * An icon-only control needs it as much as a labelled one: the more-info
   * panel's show/hide pair is a `Button` on the way in (the app bar's _More_,
   * `Alt+M`) and an IconButton on the way out (the panel's close,
   * `Alt+Shift+M`), and a badge on only one of them advertises half the
   * binding.
   *
   * As with `Button`, the control does NOT dispatch the key — the screen
   * registers the action and the dispatcher runs it (kdd/keyboard-layer).
   */
  shortcut?: Shortcut;
}

/*
 * IconButton — a compact, icon-only clickable control. The shared primitive
 * for the ad-hoc icon buttons around the app (table toolbar controls, table
 * row actions, panel actions): a plain <button> + CSS, no library (native
 * button owns the a11y contract). Because there's no visible label, `label` is
 * required and drives both aria-label and the hover title.
 *
 * `bordered` gives it an outlined box (for controls that need to read as
 * buttons, e.g. table row actions); without it, it's a bare hover-tinted icon.
 * `variant='danger'` tones a destructive action (delete). Sized small for
 * dense rows, medium otherwise. Distinct from <Button>, which is a full pill
 * with a text label; reach for IconButton when the icon IS the button.
 */
export const IconButton = (props: IconButtonProps): JSX.Element => {
  const [local, rest] = splitProps(props, [
    'icon',
    'label',
    'variant',
    'bordered',
    'size',
    'class',
    'type',
    'shortcut',
  ]);
  return (
    <button
      type={local.type ?? 'button'}
      class={
        local.class ? `${styles.iconButton} ${local.class}` : styles.iconButton
      }
      data-variant={local.variant ?? 'neutral'}
      data-bordered={local.bordered ? '' : undefined}
      data-size={local.size ?? 'medium'}
      aria-label={local.label}
      title={local.label}
      // The ARIA grammar, not the platform spelling — the badge renders the
      // human form from the same value (KB-M1, AC-KB15).
      aria-keyshortcuts={
        local.shortcut ? ariaKeyshortcuts(local.shortcut) : undefined
      }
      {...rest}
    >
      {local.icon}
      <Show when={local.shortcut}>
        {shortcut => (
          // Placed BELOW the box rather than inside its corner: a key legend is
          // wider than a 2rem icon button, so the badge would cover the icon it
          // is annotating. Nothing here clips overflow (no ripple to contain),
          // so outside is available — see IconButton.module.css.
          <ShortcutBadge shortcut={shortcut()} class={styles.shortcutBadge} />
        )}
      </Show>
    </button>
  );
};
