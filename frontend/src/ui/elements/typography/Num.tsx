import { Show, type JSX } from 'solid-js';
import {
  displayNumber,
  displayVolume,
  type DisplayedNumber,
} from '../../../intl/numberDisplay';

export interface NumProps {
  /**
   * The figure: a number to round for display, or one already displayed (a
   * stat helper's DisplayedNumber — the items band's padded figures).
   */
  value: number | DisplayedNumber;
  /** A volume in m³ — its own fixed places rather than the configured ones. */
  volume?: boolean;
  /** Decimal places, overriding the configured ones (a whole count: 0). */
  places?: number;
  /** Pad the fraction to `places` (2.50) — a headline figure in a band. */
  pad?: boolean;
}

/*
 * Num — a number shown to a user (ui-standards § tables › display rounding).
 * Rounded to the installation's configured places (or a volume's own), marked
 * `*` when that dropped digits and then carrying the exact value as hover text
 * AND as its accessible name — the hover is unreachable on touch, so a screen
 * reader at least gets the full figure (accessibility § assistive-tech
 * parity). A figure showing its whole value renders as bare text: no element,
 * no hover, nothing for the reader to learn to ignore.
 */
export const Num = (props: NumProps): JSX.Element => {
  const shown = (): DisplayedNumber =>
    typeof props.value !== 'number'
      ? props.value
      : props.volume
        ? displayVolume(props.value)
        : displayNumber(props.value, props.places, props.pad);
  return (
    <Show when={shown().exact} fallback={shown().text}>
      {exact => (
        <span title={exact()} aria-label={exact()}>
          {shown().text}
        </span>
      )}
    </Show>
  );
};
