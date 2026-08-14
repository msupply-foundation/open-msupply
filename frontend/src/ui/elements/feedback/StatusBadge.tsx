import { Show } from 'solid-js';
import type { JSX } from 'solid-js';
import styles from './StatusBadge.module.css';

/*
 * Row-status badge — the inline word chip beside a record's name marking a
 * line state (ui-standards § table interaction: "Near expiry", "Expired",
 * "On hold", "Unallocated"…). Hand-rolled: one <span> + CSS, no interaction
 * contract to buy.
 *
 * Meaning is the LABEL text (WCAG 1.4.1 — never colour alone); the tone only
 * escalates it and the optional icon reinforces it. `outline` is the
 * not-yet-filled look (dashed border, no fill — the Unallocated state).
 * Distinct roles: Badge is the tiny count pill riding a host; StatusChip is
 * the record-status table cell; THIS is the inline line-state word.
 */
export interface StatusBadgeProps {
  /** The state, as a word — "On hold", "Expired"… Already translated. */
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'error';
  /** 'solid' (default) = tone-tinted fill; 'outline' = dashed border, no fill. */
  appearance?: 'solid' | 'outline';
  /** Optional marker icon, decorative (the label carries the meaning). */
  icon?: JSX.Element;
  class?: string;
}

export const StatusBadge = (props: StatusBadgeProps) => (
  <span
    class={props.class ? `${styles.badge} ${props.class}` : styles.badge}
    data-tone={props.tone ?? 'neutral'}
    data-appearance={props.appearance ?? 'solid'}
  >
    <Show when={props.icon}>
      {icon => (
        <span class={styles.icon} aria-hidden="true">
          {icon()}
        </span>
      )}
    </Show>
    {props.label}
  </span>
);
