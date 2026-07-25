import { InfoIcon } from '../../icons';
import { t } from '../../../intl';
import { Popover, type PopoverPlacement } from './Popover';
import styles from './InfoTooltip.module.css';

export interface InfoTooltipProps {
  /** The explanatory text shown in the bubble. */
  text: string;
  /**
   * Accessible name for the icon-only trigger (required for a11y). Defaults to
   * the localised "More information".
   */
  label?: string;
  /** Preferred popover side/alignment. Default 'top'. */
  placement?: PopoverPlacement;
  /** `data-testid` stamped on the trigger button (e2e/TESTIDS.md). */
  triggerTestId?: string;
}

/*
 * InfoTooltip — a quiet info icon that reveals a short explanation in a popover
 * on hover / focus, and on click / tap too (so it opens on touch, where there
 * is no hover). The help-text sibling of Comment: a thin wrapper over the
 * native Popover (see kdd/own-simple-buy-hard), for the "?"/info affordance the
 * current app hangs off field labels and dashboard stats. Pass it to an input's
 * `labelInfo` slot to explain a field (e.g. the inbound Currency-tab rate), or
 * render it inline anywhere a term needs a gloss.
 */
export const InfoTooltip = (props: InfoTooltipProps) => (
  <span class={styles.wrapper}>
    <Popover
      openOnHover
      placement={props.placement ?? 'top'}
      trigger={<InfoIcon />}
      triggerLabel={props.label ?? t('label.more-information')}
      triggerClass={styles.trigger}
      triggerTestId={props.triggerTestId}
      class={styles.panel}
    >
      <p class={styles.body}>{props.text}</p>
    </Popover>
  </span>
);
