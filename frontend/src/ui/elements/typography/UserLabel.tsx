import { Show, type JSX } from 'solid-js';
import { InfoTooltip } from '../feedback/InfoTooltip';
import styles from './UserLabel.module.css';

export interface UserLabelProps {
  /** The recorded user's name; a dash renders when there is none. */
  username?: string | null;
  /**
   * The user's email, revealed by an InfoTooltip after the name. No email, no
   * icon — the affordance only appears when there is something to show.
   */
  email?: string | null;
  /**
   * Accessible name for the icon-only tooltip trigger — the field this user
   * annotates (e.g. t('label.entered-by')), so assistive tech hears which
   * row's detail the icon opens.
   */
  label: string;
  /** Stamped as `data-testid` on the wrapper when set. */
  testId?: string;
}

/*
 * UserLabel — a recorded user's name with their email behind the shared info
 * affordance (InfoTooltip). One treatment for the "Entered by" / "Edited by"
 * side-panel row that was hand-rolled five ways across the detail verticals
 * (docs/SIDE_PANEL.md § recipes); font and weight inherit from the
 * surrounding context, like any value text.
 */
export const UserLabel = (props: UserLabelProps): JSX.Element => (
  <span class={styles.wrapper} data-testid={props.testId}>
    {props.username ?? '—'}
    <Show when={props.email}>
      {email => <InfoTooltip label={props.label} text={email()} />}
    </Show>
  </span>
);
