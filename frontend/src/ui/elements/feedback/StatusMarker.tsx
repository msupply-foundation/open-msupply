import type { Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckIcon,
  InfoIcon,
  type IconProps,
} from '../../icons';
import styles from './StatusMarker.module.css';

/*
 * StatusMarker — an inline severity-toned glyph beside a value (registry role
 * "inline status marker"): a table cell's excess-request warning, an option
 * row's emergency flag, a reason-missing error. Alert's severity vocabulary
 * and default glyphs, shrunk to a bare marker for surfaces where a banner (or
 * even Alert's compact chip) is too heavy.
 *
 * Accessibility (spec/ui-standards/accessibility.md § assistive-tech parity):
 * the icons themselves render aria-hidden, so a bare toned icon is silent AND
 * colour-alone. The marker therefore REQUIRES its meaning as `label` and
 * carries it via role="img" + aria-label (the BooleanCell pattern), and each
 * severity has a distinct default glyph — never meaning by colour alone.
 */
export type StatusMarkerSeverity = 'error' | 'warning' | 'info' | 'success';

const ICONS: Record<StatusMarkerSeverity, Component<IconProps>> = {
  error: AlertCircleIcon,
  warning: AlertTriangleIcon,
  info: InfoIcon,
  success: CheckIcon,
};

export const StatusMarker = (props: {
  severity: StatusMarkerSeverity;
  /**
   * The marker's MEANING, e.g. "The quantity requested exceeds the suggested
   * quantity" — never the column/field name, which says nothing about why the
   * marker is there.
   */
  label: string;
  /** Replaces the severity's default glyph (by intent), as Alert's `icon`. */
  icon?: Component<IconProps>;
}) => (
  <span
    class={styles.marker}
    data-severity={props.severity}
    role="img"
    aria-label={props.label}
  >
    <Dynamic component={props.icon ?? ICONS[props.severity]} />
  </span>
);
