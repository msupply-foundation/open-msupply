import { splitProps, type JSX } from 'solid-js';
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
      {...rest}
    >
      {local.icon}
    </button>
  );
};
