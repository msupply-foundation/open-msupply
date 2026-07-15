import { type Component, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckIcon,
  InfoIcon,
  type IconProps,
} from '../../icons';
import styles from './Alert.module.css';

export type AlertSeverity = 'error' | 'warning' | 'info' | 'success';

/* Same icon choices as the current app's Alert wrapper: its own triangle /
   circle-i / check per severity, and error falling through to the MUI default
   exclamation-in-circle (our AlertCircleIcon). */
const ICONS: Record<AlertSeverity, Component<IconProps>> = {
  error: AlertCircleIcon,
  warning: AlertTriangleIcon,
  info: InfoIcon,
  success: CheckIcon,
};

export interface AlertProps {
  severity: AlertSeverity;
  children: JSX.Element;
  class?: string;
  /** `data-testid` for the alert panel (locale-stable test hook, e2e/TESTIDS.md). */
  testId?: string;
}

/*
 * Alert panel — hand-rolled, one <div> + CSS, no library (the current app
 * wraps MUI's Alert; a static message panel has no interaction contract to
 * buy). Matches its rendered look: pale severity-tinted panel, 10px radius,
 * severity-coloured icon, tinted text. Severity is never colour-alone — each
 * severity has a distinct icon shape, and the message carries the meaning.
 * role="alert" (as MUI) so an alert appearing dynamically is announced;
 * alerts rendered with the page just sit quiet.
 */
export const Alert = (props: AlertProps) => (
  <div
    class={props.class ? `${styles.alert} ${props.class}` : styles.alert}
    data-severity={props.severity}
    data-testid={props.testId}
    role="alert"
  >
    <span class={styles.icon} aria-hidden="true">
      <Dynamic component={ICONS[props.severity]} />
    </span>
    <div class={styles.message}>{props.children}</div>
  </div>
);
