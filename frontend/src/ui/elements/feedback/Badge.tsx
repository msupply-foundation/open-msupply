import styles from './Badge.module.css';

/*
 * Count / status badge — the small pill that rides on another element (the
 * current app's nav-entry sync badge: a small count, "99+", or an
 * alert mark). Hand-rolled: one <span> + CSS, no interaction contract to buy.
 *
 * Meaning is carried by the label text (and the host's `title`/accessible
 * text) — the tone only escalates it, never replaces it (no colour-alone
 * meaning). Tones are semantic: neutral (default), warning, error.
 */
export interface BadgeProps {
  /** Short text — a count, a capped "99+", or "!". */
  label: string;
  tone?: 'neutral' | 'warning' | 'error';
  /** Hover / assistive elaboration (e.g. the exact count behind a "99+"). */
  title?: string;
  class?: string;
}

export const Badge = (props: BadgeProps) => (
  <span
    class={props.class ? `${styles.badge} ${props.class}` : styles.badge}
    data-tone={props.tone ?? 'neutral'}
    title={props.title}
  >
    {props.label}
  </span>
);
